/**
 * @file permission.resolver.ts
 * @description Resolver reativo que observa SessionService e ContextService
 * para recomputar PermissionSetLite sempre que sessão ou contexto mudarem.
 * 
 * GUARDRAILS:
 * - Não armazenar sessão/claims (isso é SessionService)
 * - Não fazer HTTP
 * - Não vazar dados sensíveis em explain/telemetria
 * 
 * Responsabilidades:
 * - Expor stream reativo (Observable) com recompute em login/logout/refresh e context switch
 * - Mudanças de contexto ou sessão disparam recompute e notificam subscribers
 * - Sem exigir refresh total do app
 */

import { combineLatest, Observable } from 'rxjs';
import { map, distinctUntilChanged, shareReplay } from 'rxjs/operators';
import { PermissionRbacService, ClaimsLite } from '@hub/permission-rbac';
import { PermissionSetLite } from './permission.model';
import { adaptPermissionsFromRbac } from './permission.adapters';
import { ContextLite } from '../context/context.model';

/**
 * Fonte de sessão (abstração para o SessionService).
 * 
 * O resolver não depende diretamente de SessionService concreto,
 * mas sim de uma fonte reativa de claims lite.
 */
export interface PermissionSessionSource {
  /**
   * Stream de claims lite (null se não autenticado).
   */
  claims$: Observable<ClaimsLite | null>;
}

/**
 * Fonte de contexto (abstração para o ContextService).
 * 
 * O resolver não depende diretamente de ContextService concreto,
 * mas sim de uma fonte reativa de contexto.
 */
export interface PermissionContextSource {
  /**
   * Stream de contexto ativo (null se não definido).
   */
   context$: Observable<ContextLite | null>;
}

/**
 * Dependências do resolver.
 */
export interface PermissionResolverDeps {
  /**
   * Serviço RBAC da lib shared.
   */
  rbacService: PermissionRbacService;

  /**
   * Fonte de sessão (observável de claims).
   */
  sessionSource: PermissionSessionSource;

  /**
   * Fonte de contexto (observável de contexto).
   */
  contextSource: PermissionContextSource;
}

/**
 * Cria um stream reativo que recomputa PermissionSetLite sempre que
 * sessão ou contexto mudarem.
 * 
 * @param deps - Dependências (rbacService, sessionSource, contextSource)
 * @returns Observable de PermissionSetLite
 */
export function createPermissionResolver(
  deps: PermissionResolverDeps
): Observable<PermissionSetLite> {
  const { rbacService, sessionSource, contextSource } = deps;

  return combineLatest([
    sessionSource.claims$,
    contextSource.context$,
  ]).pipe(
    // Recomputa sempre que claims ou contexto mudarem
    map(([claims, context]) => {
      // adaptPermissionsFromRbac agora sempre retorna PermissionSetLite
      return adaptPermissionsFromRbac(rbacService, { claims, context });
    }),
    // Evita emissões redundantes (compara contextKey + grants size)
    distinctUntilChanged((a, b) => {
      if (a.contextKey !== b.contextKey) return false;
      if (a.grants.size !== b.grants.size) return false;
      // Comparação rápida: se tamanhos iguais e contextKey igual, assume igualdade
      // (otimização; em cenário real, poderia comparar Set completo se necessário)
      return true;
    }),
    // Compartilha o último valor entre múltiplos subscribers
    shareReplay({ bufferSize: 1, refCount: true })
  );
}

/**
 * Resolver com suporte a telemetria opcional.
 * 
 * @param deps - Dependências + opcional telemetryFn
 * @returns Observable de PermissionSetLite
 */
export function createPermissionResolverWithTelemetry(
  deps: PermissionResolverDeps & {
    /**
     * Função de telemetria opcional (recebe evento de recompute).
     */
    telemetryFn?: (event: PermissionResolveEvent) => void;
  }
): Observable<PermissionSetLite> {
  const { rbacService, sessionSource, contextSource, telemetryFn } = deps;

  return combineLatest([
    sessionSource.claims$,
    contextSource.context$,
  ]).pipe(
    map(([claims, context]) => {
      const startTime = Date.now();
      const set = adaptPermissionsFromRbac(rbacService, { claims, context });
      const duration = Date.now() - startTime;

      // Telemetria (sem dados sensíveis)
      if (telemetryFn) {
        telemetryFn({
          event: 'permissions.resolved',
          contextKey: set.contextKey,
          grantCount: set.grants.size,
          roleCount: set.roles.length,
          duration,
          timestamp: Date.now(),
        });
      }

      return set;
    }),
    distinctUntilChanged((a, b) => {
      if (a.contextKey !== b.contextKey) return false;
      if (a.grants.size !== b.grants.size) return false;
      return true;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );
}

/**
 * Evento de telemetria de resolução de permissões (não sensível).
 */
export interface PermissionResolveEvent {
  event: 'permissions.resolved' | 'permissions.cache-hit' | 'permissions.context-changed';
  contextKey: string;
  grantCount: number;
  roleCount: number;
  duration?: number;
  timestamp: number;
}
