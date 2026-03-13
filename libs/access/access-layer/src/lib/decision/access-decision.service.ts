/**
 * @file access-decision.service.ts
 * @description Orquestrador de decisão final de acesso no frontend.
 * 
 * GUARDRAILS:
 * - Não autenticar usuário (isso é SessionService/AuthGuard)
 * - Não montar menu diretamente (isso é NavigationService)
 * - Não implementar RBAC (isso é PermissionService/permission-rbac)
 * - Não implementar ABAC/policy rules (isso é PolicyEngine)
 * - Não fazer HTTP direto
 * 
 * Responsabilidades:
 * - Ser a fonte única para decisão final de acesso no frontend
 * - Compor flags + perms + policies de forma determinística e auditável
 * - Padronizar denyReason para consumo por guards e navegação
 * - Manter API simples: canEnter/canView/canExecute (+watch)
 * 
 * API principais:
 * - canEnter(route/toolKey, requirements?): DecisionResult
 * - canView(menuItem, requirements?): DecisionResult
 * - canExecute(actionKey, requirements?): DecisionResult
 * - watchDecisions(): Observable de mudanças
 */

import { Injectable, Optional } from '@angular/core';
import { Route } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import {
  DecisionResult,
  DenyReason,
  Requirements,
  EvidenceLite,
  createAllowDecision,
  createDenyDecision,
} from './access-decision.model';
import {
  extractRequirementsFromRoute,
  extractRequirementsFromToolMetadata,
  mergeRequirements,
  ToolMetadataLite,
} from './access-decision.requirements';
import {
  denyReasonToMessage,
} from './access-decision.util';
import { PermissionService } from '../permissions/permission.service';
import { FeatureFlagService } from '../flags/feature-flag.service';
import { ContextService } from '../context/context.service';

/**
 * Fonte de sessão (abstração para SessionService ainda não implementado).
 * 
 * AccessDecisionService não depende de SessionService concreto,
 * mas sim de uma fonte reativa de informações de autenticação.
 */
export interface SessionSource {
  /**
   * Observable indicando se o usuário está autenticado.
   */
  isAuthenticated$: Observable<boolean>;

  /**
   * Snapshot síncrono da autenticação.
   */
  isAuthenticated(): boolean;
}

/**
 * Fonte de políticas ABAC (abstração para PolicyEngine ainda não implementado).
 * 
 * AccessDecisionService delega avaliação de policies ao PolicyEngine.
 */
export interface PolicySource {
  /**
   * Avalia uma policy por key.
   * 
   * @param policyKey - Chave da policy (ex.: 'context.project.active')
   * @returns true se a policy permite, false caso contrário
   */
  evaluate(policyKey: string): boolean;
}

/**
 * Configuração opcional do AccessDecisionService.
 */
export interface AccessDecisionConfig {
  /**
   * Habilitar telemetria de decisões (eventos não sensíveis).
   */
  enableTelemetry?: boolean;

  /**
   * Função de telemetria customizada.
   */
  telemetryFn?: (event: DecisionTelemetryEvent) => void;
}

/**
 * Evento de telemetria de decisão (não sensível).
 */
export interface DecisionTelemetryEvent {
  event: 'decision.allow' | 'decision.deny';
  resourceType: 'route' | 'tool' | 'action' | 'menu';
  resourceId: string;
  denyReason?: DenyReason;
  timestamp: number;
}

/**
 * AccessDecisionService: orquestrador de decisão final de acesso.
 * 
 * Uso no Shell/Tools/RouteGuards:
 * ```typescript
 * constructor(private accessDecision: AccessDecisionService) {}
 * 
 * // Checar acesso a rota
 * const decision = this.accessDecision.canEnter(route);
 * if (!decision.allow) {
 *   console.log('Acesso negado:', decision.denyReason);
 * }
 * 
 * // Checar acesso a tool
 * const canAccessPip = this.accessDecision.canEnterTool('pip');
 * 
 * // Checar ação
 * const canApprove = this.accessDecision.canExecute('pip.approve');
 * 
 * // Observar mudanças
 * this.accessDecision.watchDecisions().subscribe(() => {
 *   // Reavaliar decisões (contexto/sessão/flags mudaram)
 * });
 * ```
 * 
 * IMPORTANTE:
 * - Decisões são determinísticas (mesma entrada → mesma saída)
 * - DenyReason é mapeável para HTTP status (401/403/404)
 * - UI usa como "hint final"; segurança real no backend
 */
@Injectable({
  providedIn: 'root',
})
export class AccessDecisionService {
  /**
   * Observable que emite quando algo relevante para decisões muda.
   * 
   * Combinação de: sessão, contexto, flags, permissões.
   */
  public readonly decisionsInvalidated$: Observable<void>;

  private config: AccessDecisionConfig;

  constructor(
    @Optional() private permissionService?: PermissionService,
    @Optional() private featureFlagService?: FeatureFlagService,
    @Optional() private contextService?: ContextService,
    @Optional() private sessionSource?: SessionSource,
    @Optional() private policySource?: PolicySource,
    @Optional() config?: AccessDecisionConfig
  ) {
    this.config = config ?? { enableTelemetry: false };

    // Combina todas as fontes reativas para detectar invalidação
    const streams: Observable<unknown>[] = [];

    if (sessionSource?.isAuthenticated$) {
      streams.push(sessionSource.isAuthenticated$);
    }

    if (contextService?.context$) {
      streams.push(contextService.context$());
    }

    if (permissionService?.permissions$) {
      streams.push(permissionService.permissions$);
    }

    // Se não há streams, usa observable vazio
    this.decisionsInvalidated$ =
      streams.length > 0
        ? combineLatest(streams).pipe(
            map(() => undefined),
            distinctUntilChanged(),
            shareReplay({ bufferSize: 1, refCount: true })
          )
        : of(undefined);
  }

  /**
   * Avalia se o usuário pode entrar em uma rota.
   * 
   * Short-circuit: NOT_FOUND > DISABLED > UNAUTHENTICATED > FORBIDDEN > CONTEXT_REQUIRED > POLICY_DENIED
   * 
   * @param route - Angular Route ou toolKey string
   * @param requirements - Requirements opcionais (sobrescreve route.data)
   * @returns DecisionResult determinístico
   */
  canEnter(route: Route | string, requirements?: Requirements): DecisionResult {
    const resourceId = typeof route === 'string' ? route : route.path || 'unknown';
    const resourceType = 'route';

    // Extrair requirements
    let reqs: Requirements;
    if (requirements) {
      reqs = requirements;
    } else if (typeof route === 'string') {
      reqs = { toolKey: route, requireAuth: true };
    } else {
      reqs = extractRequirementsFromRoute(route) || { requireAuth: true };
    }

    return this.evaluateDecision(resourceType, resourceId, reqs);
  }

  /**
   * Avalia se o usuário pode entrar em uma tool.
   * 
   * Atalho para canEnter com toolKey.
   * 
   * @param toolKey - Chave da tool (ex.: 'pip', 'vp')
   * @param toolMetadata - Metadata opcional da tool (do ToolRegistry)
   * @returns DecisionResult determinístico
   */
  canEnterTool(toolKey: string, toolMetadata?: ToolMetadataLite): DecisionResult {
    const metaReqs = toolMetadata
      ? extractRequirementsFromToolMetadata(toolMetadata)
      : null;

    const reqs = mergeRequirements(metaReqs, { toolKey, requireAuth: true });

    return this.evaluateDecision('tool', toolKey, reqs);
  }

  /**
   * Avalia se o usuário pode visualizar um item de menu.
   * 
   * Usado por NavigationService para filtrar menu.
   * 
   * @param menuItemKey - Chave do item de menu
   * @param requirements - Requirements do item
   * @returns DecisionResult determinístico
   */
  canView(menuItemKey: string, requirements: Requirements): DecisionResult {
    return this.evaluateDecision('menu', menuItemKey, requirements);
  }

  /**
   * Avalia se o usuário pode executar uma ação.
   * 
   * Usado por UI para habilitar/desabilitar botões.
   * 
   * @param actionKey - Chave da ação (ex.: 'pip.approve', 'vp.publish')
   * @param requirements - Requirements da ação
   * @returns DecisionResult determinístico
   */
  canExecute(actionKey: string, requirements: Requirements): DecisionResult {
    return this.evaluateDecision('action', actionKey, requirements);
  }

  /**
   * Observable que emite quando decisões devem ser reavaliadas.
   * 
   * Usado por componentes para reagir a mudanças de sessão/contexto/flags.
   * 
   * @returns Observable<void>
   */
  watchDecisions(): Observable<void> {
    return this.decisionsInvalidated$;
  }

  /**
   * Avalia decisão com short-circuit determinístico.
   * 
   * Ordem de avaliação:
   * 1. Autenticação (se requireAuth=true)
   * 2. Contexto (se requireContext=true)
   * 3. Feature flag (se featureFlagKey definido)
   * 4. Permissões (se permissionKey/permissionKeys definido)
   * 5. Políticas ABAC (se policyKey definido)
   * 
   * @param resourceType - Tipo do recurso
   * @param resourceId - ID do recurso
   * @param reqs - Requirements
   * @returns DecisionResult
   */
  private evaluateDecision(
    resourceType: EvidenceLite['resourceType'],
    resourceId: string,
    reqs: Requirements
  ): DecisionResult {
    const evidence: EvidenceLite = {
      resourceType,
      resourceId,
      requirements: reqs,
      checks: {},
    };

    // 1. Checar autenticação
    if (reqs.requireAuth !== false) {
      const authenticated = this.sessionSource?.isAuthenticated() ?? false;
      evidence.checks = evidence.checks || {};
    evidence.checks.authenticated = authenticated;

      if (!authenticated) {
        const decision = createDenyDecision(DenyReason.UNAUTHENTICATED, {
          ...evidence,
          message: denyReasonToMessage(DenyReason.UNAUTHENTICATED),
        });
        this.emitTelemetry(decision);
        return decision;
      }
    }

    // 2. Checar contexto
    if (reqs.requireContext) {
      const hasContext = this.contextService?.snapshot() !== null;
      evidence.checks = evidence.checks || {};
      evidence.checks.contextPresent = hasContext;

      if (!hasContext) {
        const decision = createDenyDecision(DenyReason.CONTEXT_REQUIRED, {
          ...evidence,
          message: denyReasonToMessage(DenyReason.CONTEXT_REQUIRED),
        });
        this.emitTelemetry(decision);
        return decision;
      }
    }

    // 3. Checar feature flag
    if (reqs.featureFlagKey) {
      const flagEnabled = this.featureFlagService?.isEnabled(reqs.featureFlagKey) ?? true;
      evidence.checks = evidence.checks || {};
      evidence.checks.flagsEnabled = flagEnabled;

      if (!flagEnabled) {
        const decision = createDenyDecision(DenyReason.DISABLED, {
          ...evidence,
          message: denyReasonToMessage(DenyReason.DISABLED),
        });
        this.emitTelemetry(decision);
        return decision;
      }
    }

    // 4. Checar permissões
    let permGranted = true;

    if (reqs.permissionKey) {
      permGranted = this.permissionService?.has(reqs.permissionKey) ?? false;
    }

    if (reqs.permissionKeys) {
      const { keys, any } = reqs.permissionKeys;
      if (any) {
        permGranted = this.permissionService?.canAny(keys) ?? false;
      } else {
        permGranted = this.permissionService?.canAll(keys) ?? false;
      }
    }

    evidence.checks = evidence.checks || {};
    evidence.checks.permissionsGranted = permGranted;

    if (!permGranted) {
      const decision = createDenyDecision(DenyReason.FORBIDDEN, {
        ...evidence,
        message: denyReasonToMessage(DenyReason.FORBIDDEN),
      });
      this.emitTelemetry(decision);
      return decision;
    }

    // 5. Checar políticas ABAC
    if (reqs.policyKey) {
      const policyPassed = this.policySource?.evaluate(reqs.policyKey) ?? true;
      evidence.checks = evidence.checks || {};
      evidence.checks.policiesPassed = policyPassed;

      if (!policyPassed) {
        const decision = createDenyDecision(DenyReason.POLICY_DENIED, {
          ...evidence,
          message: denyReasonToMessage(DenyReason.POLICY_DENIED),
        });
        this.emitTelemetry(decision);
        return decision;
      }
    }

    // Tudo ok: allow
    const decision = createAllowDecision(evidence);
    this.emitTelemetry(decision);
    return decision;
  }

  /**
   * Emite telemetria de decisão (se habilitada).
   */
  private emitTelemetry(decision: DecisionResult): void {
    if (!this.config.enableTelemetry || !this.config.telemetryFn) {
      return;
    }

    const event: DecisionTelemetryEvent = {
      event: decision.allow ? 'decision.allow' : 'decision.deny',
      resourceType: decision.evidence?.resourceType || 'route',
      resourceId: decision.evidence?.resourceId || 'unknown',
      denyReason: decision.denyReason,
      timestamp: decision.timestamp,
    };

    this.config.telemetryFn(event);
  }
}
