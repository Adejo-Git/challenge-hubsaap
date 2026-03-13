/* eslint-disable @angular-eslint/prefer-inject */
/**
 * @file route-guards.ts
 * @description Route Guards do Hub-Saap (CanActivate + CanMatch).
 *
 * Implementa a lógica de proteção de rotas consultando o AccessDecisionService
 * de forma determinística e sem duplicar lógica de autenticação ou autorização.
 *
 * GUARDRAILS (non-responsibilities):
 * - ❌ Não autentica usuário (isso é SessionService/AuthGuard)
 * - ❌ Não calcula RBAC/ABAC localmente (delegado ao AccessDecisionService)
 * - ❌ Não usa HttpClient direto (sem network calls no guard)
 * - ❌ Não constrói menu/breadcrumbs (isso é NavigationService)
 * - ❌ Não conhece detalhes internos de tools além do toolKey/flag/permission map
 *
 * RESPONSABILIDADES:
 * - Aplicar decisão final de acesso via AccessDecisionService.canEnter()
 * - Validar existência da tool no ToolRegistryService
 * - Bloquear rotas desabilitadas por feature flag
 * - Retornar UrlTree para fallback (401/403/404) conforme denyReason
 * - Emitir telemetria mínima de allow/deny (sem dados sensíveis)
 * - Prevenir bypass por URL direta em /tools/*
 */

import { Injectable, Optional, inject } from '@angular/core';
import {
  CanActivateFn,
  CanMatchFn,
  Router,
} from '@angular/router';
import { AccessDecisionService } from '@hub/access-layer/decision';
import { ToolRegistryService } from '@hub/tool-registry';
import { FeatureFlagService } from '@hub/access-layer/flags';
import { ObservabilityService } from '@hub/observability';

import {
  DenyReason,
  extractRequirementsFromRoute,
  extractToolKeyFromRoute,
  validateToolKey,
  normalizeToolKey,
  denyReasonToUrlTree,
  buildGuardTelemetry,
  isPublicRoute,
} from './route-guards.util';

/**
 * RouteGuards: Implementação do contrato de CanActivate e CanMatch para Shell.
 *
 * Fluxo de decisão:
 * 1. Extrair requirements de route.data (toolKey, featureFlagKey, permissionKey, ...)
 * 2. Validar existência da tool (ToolRegistryService.exists())
 * 3. Validar feature flag (FeatureFlagService.isEnabled())
 * 4. Consultar decisão final (AccessDecisionService.canEnter())
 * 5. Retornar boolean (allow) ou UrlTree (deny com fallback)
 * 6. Emitir telemetria mínima (allow/deny + reason)
 *
 * TODO IMPORTANTE:
 * - Integrar com projeto Nx real do Shell (ajustar imports quando necessário)
 * - Registrar guards nas rotas em shell-routes.ts
 * - Testar com AccessDecisionService real (não mock)
 * - Validar mapeamento 401/403/404 em cenários reais
 */
@Injectable({
  providedIn: 'root',
})
export class RouteGuardsService {
  constructor(
    private readonly router: Router,
    @Optional() private readonly accessDecision?: AccessDecisionService,
    @Optional() private readonly toolRegistry?: ToolRegistryService,
    @Optional() private readonly featureFlags?: FeatureFlagService,
    @Optional() private readonly observability?: ObservabilityService
  ) {}

  /**
   * CanMatch guard para rotas lazy de tools.
   *
   * Aplicado ANTES de fazer download/parsing do módulo.
   * Otimiza bundle: se for negar, nem carrega a tool lazy.
   *
   * Fluxo:
   * 1. Validar toolKey presente
   * 2. Validar tool existe no registry
   * 3. Validar feature flag habilitada
   * 4. Retornar true (match) ou false (skip carregamento)
   *
   * @param route - ActivatedRouteSnapshot
   * @param state - RouterStateSnapshot
   * @returns boolean or UrlTree
   *
   * @example
   * // Em tool-routes.ts:
   * {
   *   path: ':toolKey',
   *   canMatch: [routeGuardsService.canMatch],
   *   loadChildren: () => import(...).then(...)
   * }
   */
  canMatch: CanMatchFn = (route, state) => {
    // Passo 0: Rotas públicas nunca são protegidas (evita loop com /error)
    // Accept both UrlSegment[] (runtime) and RouterStateSnapshot-like test objects with `url` string.
    let pathFromSegments = '';
    if (Array.isArray(state)) {
      // state is UrlSegment[] at runtime; use a narrow shape for segments
      pathFromSegments = '/' + (state as Array<{ path: string }>).map((s) => s.path).filter(Boolean).join('/');
    } else if (state && typeof (state as unknown as { url?: unknown }).url === 'string') {
      pathFromSegments = (state as unknown as { url: string }).url;
    } else {
      pathFromSegments = '';
    }

    if (isPublicRoute(pathFromSegments)) {
      return true;
    }

    // Passo 1: Extrair toolKey de params ou route.data
    const toolKey = extractToolKeyFromRoute(route);
    const toolKeyValidation = validateToolKey(toolKey);

    if (!toolKeyValidation.valid) {
      // toolKey ausente/vazio → 404
      this.emitTelemetry(false, pathFromSegments, toolKeyValidation.reason, toolKey);
      return this.router.parseUrl('/error/404');
    }

    // Passo 2: Validar existência da tool no registry
    const normalized = normalizeToolKey(toolKey);
    type ToolKeyForRegistry = Parameters<ToolRegistryService['exists']>[0];
    const toolExists = this.toolRegistry?.exists(normalized as unknown as ToolKeyForRegistry) ?? true; // default allow se registry unavailable

    if (!toolExists) {
      // Tool não existe no registry → 404
      this.emitTelemetry(false, pathFromSegments, DenyReason.UNKNOWN_TOOL, normalized);
      return this.router.parseUrl('/error/404');
    }

    // Passo 3: Validar feature flag (se toolKey.enabled é obrigatório)
    // Regra: Se há flag esperada e está desabilitada → 404
    const reqs = extractRequirementsFromRoute(route);
    if (reqs.featureFlagKey) {
      const flagEnabled = this.featureFlags?.isEnabled(reqs.featureFlagKey) ?? true; // default allow se unavailable

      if (!flagEnabled) {
        // Tool desabilitada por flag → 404 (conforme regra definida)
        this.emitTelemetry(false, pathFromSegments, DenyReason.FLAG_DISABLED, normalized);
        return this.router.parseUrl('/error/404');
      }
    }

    // Passo 4: canMatch não nega por RBAC/policy (delegado ao canActivate)
    // Retornar true para permitir continuação na rota (canActivate validará depois).
    this.emitTelemetry(true, pathFromSegments, undefined, normalized);
    return true;
  };

  /**
   * CanActivate guard para validação final de acesso.
   *
   * Aplicado DEPOIS de module lazy loaded e componente renderizado.
   * Consulta AccessDecisionService para avaliação final de RBAC/ABAC/policy.
   *
   * Fluxo:
   * 1. Extrair requirements de route.data
   * 2. Consultar AccessDecisionService.canEnter()
   * 3. Se allow=false, retornar UrlTree para fallback apropriado
   * 4. Emitir telemetria de decisão
   *
   * @param route - ActivatedRouteSnapshot
   * @param state - RouterStateSnapshot
   * @returns boolean or UrlTree
   *
   * @example
   * // Em shell-routes.ts ou tool-routes.ts:
   * {
   *   path: 'dashboard',
   *   component: DashboardComponent,
   *   canActivate: [routeGuardsService.canActivate],
   *   data: { featureFlagKey: 'global.dashboard', ... }
   * }
   */
  canActivate: CanActivateFn = (route, state) => {
    // Passo 0: Rotas públicas nunca são protegidas
    if (isPublicRoute(state.url)) {
      return true;
    }

    // Passo 1: Extrair requirements de route.data
    const reqs = extractRequirementsFromRoute(route);
    const toolKey = extractToolKeyFromRoute(route) || reqs.toolKey;
    let normalizedToolKey: string | undefined;

    if (toolKey !== undefined) {
      const toolValidation = validateToolKey(toolKey);
      if (!toolValidation.valid) {
        const reason = toolValidation.reason ?? DenyReason.MISSING_ROUTE_DATA;
        this.emitTelemetry(false, state.url, reason, toolKey);
        return denyReasonToUrlTree(reason, this.router);
      }

      normalizedToolKey = normalizeToolKey(toolKey);
      type ToolKeyForRegistry = Parameters<ToolRegistryService['exists']>[0];
      const toolExists = this.toolRegistry?.exists(normalizedToolKey as unknown as ToolKeyForRegistry) ?? true;
      if (!toolExists) {
        this.emitTelemetry(false, state.url, DenyReason.UNKNOWN_TOOL, normalizedToolKey);
        return denyReasonToUrlTree(DenyReason.UNKNOWN_TOOL, this.router);
      }

      if (reqs.featureFlagKey) {
        const flagEnabled = this.featureFlags?.isEnabled(reqs.featureFlagKey) ?? true;
        if (!flagEnabled) {
          this.emitTelemetry(false, state.url, DenyReason.FLAG_DISABLED, normalizedToolKey);
          return denyReasonToUrlTree(DenyReason.FLAG_DISABLED, this.router);
        }
      }
    }

    // Passo 2: Consultar AccessDecisionService
    // Construir request mínimo para AccessDecisionService.canEnter()
    let decisionResult: { action: string; allowed: boolean; denyReason?: string } | null | undefined;
    try {
      decisionResult = this.accessDecision?.canEnter(reqs);
    } catch {
      this.emitTelemetry(false, state.url, DenyReason.FORBIDDEN, normalizedToolKey ?? toolKey);
      return denyReasonToUrlTree(DenyReason.FORBIDDEN, this.router);
    }

    const resolvedDecision = decisionResult ?? {
      action: 'enter',
      allowed: true, // default allow se AccessDecisionService unavailable
    };

    // Passo 3: Mapear resultado em UrlTree se negado
    if (!resolvedDecision.allowed) {
      const denyReason = this.mapAccessDecisionReasonToDenyReason(resolvedDecision.denyReason);
      this.emitTelemetry(false, state.url, denyReason, normalizedToolKey ?? toolKey);
      return denyReasonToUrlTree(denyReason, this.router);
    }

    // Passo 4: Allow e registrar telemetria
    this.emitTelemetry(true, state.url, undefined, normalizedToolKey ?? toolKey);
    return true;
  };

  /**
   * Mapeia denyReason do AccessDecisionService para DenyReason do guard.
   *
   * Conversão de códigos de deny do Access Layer para categorias do guard.
   *
   * @param accessDecisionReason - Reason code do AccessDecisionService
   * @returns DenyReason do guard para fallback apropriado
   */
  private mapAccessDecisionReasonToDenyReason(
    accessDecisionReason: string | undefined
  ): DenyReason {
    switch (accessDecisionReason) {
      case 'unauthenticated':
        return DenyReason.UNAUTHENTICATED;
      case 'forbidden':
      case 'forbidden:permission':
      case 'forbidden:policy':
        return DenyReason.FORBIDDEN;
      case 'flagOff':
      case 'disabled':
        return DenyReason.FLAG_DISABLED;
      case 'notFound':
        return DenyReason.UNKNOWN_TOOL;
      default:
        return DenyReason.FORBIDDEN; // fallback seguro: negar por padrão
    }
  }

  /**
   * Emite telemetria de decisão do guard (allow/deny).
   *
   * Payload seguro: sem claims, roles, tokens.
   * Objetivo: rastrear decisões para debug e observabilidade.
   *
   * @param allowed - Boolean de decisão
   * @param routePath - Caminho da rota
   * @param denyReason - Motivo de negação (se allow=false)
   * @param toolKey - Chave da tool (opcional)
   */
  private emitTelemetry(
    allowed: boolean,
    routePath: string,
    denyReason?: DenyReason,
    toolKey?: string
  ): void {
    if (!this.observability) {
      return; // observability é opcional; falha silenciosa
    }

    const payload = buildGuardTelemetry(allowed, routePath, denyReason, toolKey);
    const eventName = allowed ? 'route-guard:allow' : 'route-guard:deny';

    try {
      // Observability API uses trackEvent; prefer it and fallback to track if present.
      const obs = this.observability as unknown as { trackEvent?: (n: string, p?: Record<string, unknown>) => void; track?: (n: string, p?: Record<string, unknown>) => void };
      if (typeof obs.trackEvent === 'function') {
        obs.trackEvent(eventName, payload);
      } else if (typeof obs.track === 'function') {
        obs.track(eventName, payload);
      }
    } catch (error: unknown) {
      // Não quebrar roteador se telemetria falhar
      console.warn(`[RouteGuards] Telemetria falhou: ${eventName}`, error);
    }
   }
}

/**
 * Factory para criar CanActivateFn a partir de RouteGuardsService.
 *
 * Retorna função que pode ser usada em `canActivate: [routeGuard()]`.
 * Usa Angular's inject() para obter a instância de RouteGuardsService.
 *
 * @example
 * // Em shell-routes.ts:
 * import { routeGuard } from './route-guards';
 * {
 *   path: 'dashboard',
 *   component: DashboardComponent,
 *   canActivate: [routeGuard()]
 * }
 */
export function routeGuard(): CanActivateFn {
  return (route, state) => {
    const service = inject(RouteGuardsService);
    return service.canActivate(route, state);
  };
}

/**
 * Factory para criar CanMatchFn a partir de RouteGuardsService.
 *
 * Retorna função que pode ser usada em `canMatch: [routeMatchGuard()]`.
 * Usa Angular's inject() para obter a instância de RouteGuardsService.
 *
 * @example
 * // Em tool-routes.ts:
 * import { routeMatchGuard } from './route-guards';
 * {
 *   path: ':toolKey',
 *   canMatch: [routeMatchGuard()],
 *   loadChildren: () => import(...).then(...)
 * }
 */
export function routeMatchGuard(): CanMatchFn {
  return (route, state) => {
    const service = inject(RouteGuardsService);
    return service.canMatch(route, state);
  };
}

export { DenyReason } from './route-guards.util';
