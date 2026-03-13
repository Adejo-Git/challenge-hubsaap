/**
 * @file permission.service.ts
 * @description Facade pública do Access Layer para permissões.
 * 
 * GUARDRAILS:
 * - PermissionService não decide acesso final sozinho (isso é AccessDecisionService)
 * - UI consome apenas como "hint" (não é segurança final)
 * - Sem HTTP direto
 * - Sem expor claims completas (somente reason codes e metadados seguros)
 * 
 * Responsabilidades:
 * - permissions(): Observable de PermissionSetLite efetivo
 * - snapshot(): PermissionSnapshot síncrono
 * - has(), canAny(), canAll(): funções puras/rápidas (lookup em Set/Map)
 * - explain() (opcional): retorna informações não sensíveis
 * 
 * APIs principais:
 * - permissions$: Observable<PermissionSetLite>
 * - snapshot(): PermissionSnapshot
 * - has(key: PermissionKey): boolean
 * - canAny(keys: PermissionKey[]): boolean
 * - canAll(keys: PermissionKey[]): boolean
 * - explain(key: PermissionKey): ExplainEntry
 */

import { Injectable, Optional } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { PermissionRbacService } from '@hub/permission-rbac';
import {
  PermissionSetLite,
  PermissionSnapshot,
  PermissionKey,
  ExplainEntry,
  EMPTY_PERMISSION_SET,
  toPermissionSnapshot,
  isValidPermissionKeyFormat,
} from './permission.model';
import {
  createPermissionResolverWithTelemetry,
  PermissionSessionSource,
  PermissionContextSource,
} from './permission.resolver';

/**
 * Configuração opcional do PermissionService.
 */
export interface PermissionServiceConfig {
  /**
   * Habilitar telemetria de resolução (eventos não sensíveis).
   */
  enableTelemetry?: boolean;

  /**
   * Função de telemetria customizada.
   */
  telemetryFn?: (event: unknown) => void;
}

/**
 * PermissionService: facade pública do Access Layer para permissões.
 * 
 * Uso no Shell/Tools:
 * ```typescript
 * constructor(private permService: PermissionService) {}
 * 
 * // Observar permissões reativas
 * this.permService.permissions$.subscribe(set => {
 *   console.log('Grants atuais:', set.grants.size);
 * });
 * 
 * // Checar permissão síncrona
 * if (this.permService.has('tool.pip.write')) {
 *   // Mostrar botão de editar
 * }
 * 
 * // Checar múltiplas (any)
 * if (this.permService.canAny(['tool.pip.read', 'tool.pip.write'])) {
 *   // Mostrar seção
 * }
 * 
 * // Checar múltiplas (all)
 * if (this.permService.canAll(['tool.pip.read', 'tool.pip.write'])) {
 *   // Mostrar ação avançada
 * }
 * 
 * // Explain (debug/auditoria)
 * const result = this.permService.explain('tool.pip.delete');
 * console.log(result.reasonCode, result.message);
 * ```
 * 
 * IMPORTANTE:
 * - Não usar has/canAny/canAll para segurança final no backend.
 * - UI usa apenas como "hint" para melhorar UX (mostrar/esconder botões).
 * - Segurança real acontece no backend + AccessDecisionService (guards, etc.).
 */
@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  /**
   * Stream reativo de PermissionSetLite.
   * 
   * Emite novo valor sempre que sessão ou contexto mudarem.
   */
  public readonly permissions$: Observable<PermissionSetLite>;

  /**
   * Subject interno para manter o último valor.
   */
  private currentSet$ = new BehaviorSubject<PermissionSetLite>(EMPTY_PERMISSION_SET);

  private config: PermissionServiceConfig;

  constructor(
    private rbacService: PermissionRbacService,
    @Optional() private sessionSource?: PermissionSessionSource,
    @Optional() private contextSource?: PermissionContextSource,
    @Optional() config?: PermissionServiceConfig
  ) {
    this.config = config ?? { enableTelemetry: false };

    // Se não há fontes de sessão/contexto, mantém empty set
    if (!sessionSource || !contextSource) {
      this.permissions$ = this.currentSet$.asObservable();
      return;
    }

    // Cria resolver reativo
    this.permissions$ = createPermissionResolverWithTelemetry({
      rbacService,
      sessionSource,
      contextSource,
      telemetryFn: this.config.enableTelemetry ? this.config.telemetryFn : undefined,
    });

    // Atualiza subject interno para permitir snapshot síncrono
    this.permissions$.subscribe((set) => {
      this.currentSet$.next(set);
    });
  }

  /**
   * Retorna snapshot síncrono do PermissionSetLite atual.
   * 
   * @returns PermissionSnapshot imutável
   */
  snapshot(): PermissionSnapshot {
    return toPermissionSnapshot(this.currentSet$.value);
  }

  /**
   * Checa se o usuário tem uma permissão específica.
   * 
   * Lookup O(1) no Set interno.
   * 
   * @param key - PermissionKey (ex.: "tool.pip.write")
   * @returns true se a permissão está no grants, false caso contrário
   */
  has(key: PermissionKey): boolean {
    if (!key || !isValidPermissionKeyFormat(key)) {
      return false;
    }
    return this.currentSet$.value.grants.has(key);
  }

  /**
   * Checa se o usuário tem QUALQUER UMA das permissões fornecidas.
   * 
   * Retorna true se pelo menos uma permissão estiver no grants.
   * Array vazio retorna false.
   * 
   * @param keys - Array de PermissionKey
   * @returns true se pelo menos uma permissão existe
   */
  canAny(keys: PermissionKey[]): boolean {
    if (!keys || keys.length === 0) {
      return false;
    }
    const grants = this.currentSet$.value.grants;
    return keys.some((key) => isValidPermissionKeyFormat(key) && grants.has(key));
  }

  /**
   * Checa se o usuário tem TODAS as permissões fornecidas.
   * 
   * Retorna true somente se todas as permissões estiverem no grants.
   * Array vazio retorna true (vacuous truth).
   * 
   * @param keys - Array de PermissionKey
   * @returns true se todas as permissões existem
   */
  canAll(keys: PermissionKey[]): boolean {
    if (!keys || keys.length === 0) {
      return true; // vacuous truth
    }
    const grants = this.currentSet$.value.grants;
    return keys.every((key) => isValidPermissionKeyFormat(key) && grants.has(key));
  }

  /**
   * Explica por que uma permissão foi concedida ou negada.
   * 
   * IMPORTANTE: não retorna dados sensíveis (claims completas, tokens).
   * Apenas reason codes e metadados seguros.
   * 
   * @param key - PermissionKey
   * @returns ExplainEntry com reasonCode, message e detalhes seguros
   */
  explain(key: PermissionKey): ExplainEntry {
    if (!key || !isValidPermissionKeyFormat(key)) {
      return {
        reasonCode: 'invalid-key',
        message: `PermissionKey inválida ou formato incorreto: ${key}`,
        details: { key },
      };
    }

    const grants = this.currentSet$.value.grants;
    const hasPermission = grants.has(key);

    if (hasPermission) {
      return {
        reasonCode: 'granted',
        message: `Permissão concedida: ${key}`,
        details: {
          key,
          contextKey: this.currentSet$.value.contextKey,
          resolvedAt: this.currentSet$.value.resolvedAt,
        },
      };
    }

    return {
      reasonCode: 'missing-permission',
      message: `Permissão não concedida: ${key}`,
      details: {
        key,
        contextKey: this.currentSet$.value.contextKey,
        availableGrantsCount: grants.size,
        rolesChecked: this.currentSet$.value.roles.length,
      },
    };
  }

  /**
   * Retorna todas as permissões efetivas (grants) como array.
   * 
   * Útil para debug/auditoria.
   * 
   * @returns Array de PermissionKey
   */
  getAllGrants(): ReadonlyArray<PermissionKey> {
    return Array.from(this.currentSet$.value.grants);
  }

  /**
   * Retorna todas as roles que geraram as permissões atuais.
   * 
   * Útil para debug/auditoria.
   * 
   * @returns Array de RoleKey
   */
  getRoles(): ReadonlyArray<string> {
    return this.currentSet$.value.roles;
  }

  /**
   * Retorna chave de contexto atual.
   * 
   * @returns contextKey (ex.: "tenant1|client2|project3|prod")
   */
  getContextKey(): string {
    return this.currentSet$.value.contextKey;
  }
}
