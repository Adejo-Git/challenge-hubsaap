/**
 * @file permission.adapters.ts
 * @description Adapter entre permission-rbac e PermissionSetLite.
 * 
 * GUARDRAILS:
 * - Delegar RBAC ao permission-rbac (não duplicar regras)
 * - Não introduzir condicionais de domínio na UI
 * - Não adicionar dependências externas
 * - Erros esperados usam error-model
 * 
 * Responsabilidades:
 * - Converter roles→perms para PermissionSetLite
 * - Custo previsível e estrutura eficiente para lookup
 */

import { PermissionRbacService, ClaimsLite, Grants } from '@hub/permission-rbac';
import { PermissionSetLite, EMPTY_PERMISSION_SET } from './permission.model';
import { buildContextKey, ContextLite } from '../context/context.model';

/**
 * Opciones para o adapter de permissões.
 */
export interface AdaptPermissionsOptions {
  /**
   * Claims lite da sessão atual (roles, sub, etc.).
   */
  claims: ClaimsLite | null;

  /**
   * Contexto ativo (tenant/client/project/env).
   */
  context: ContextLite | null;

  /**
   * Timestamp de resolução (opcional, usa Date.now() se não fornecido).
   */
  timestamp?: number;
}

/**
 * Adapter: converte claims + contexto em PermissionSetLite.
 * 
 * Delega ao PermissionRbacService a resolução de grants efetivos.
 * 
 * @param rbacService - Serviço RBAC da lib shared
 * @param options - Claims e contexto
 * @returns PermissionSetLite ou EMPTY_PERMISSION_SET se sessão/contexto ausentes
 */
export function adaptPermissionsFromRbac(
  rbacService: PermissionRbacService,
  options: AdaptPermissionsOptions
): PermissionSetLite {
  const { claims, context, timestamp } = options;

  // Se não há claims (usuário anônimo ou sessão não restaurada), retorna vazio
  if (!claims) {
    return EMPTY_PERMISSION_SET;
  }

  // Se não há contexto, retorna vazio (permissões dependem de contexto)
  if (!context) {
    return {
      grants: new Set<string>(),
      roles: claims.roles ?? [],
      resolvedAt: timestamp ?? Date.now(),
      contextKey: 'no-context',
    };
  }

  // Configura o RBAC service com claims atuais
  try {
    rbacService.setSession(claims);
    const ctxKey = buildContextKey(context);
    rbacService.setContext(ctxKey);

    // Resolve grants efetivos
    const grants: Grants = rbacService.resolveGrants();

    return {
      grants,
      roles: claims.roles ?? [],
      resolvedAt: timestamp ?? Date.now(),
      contextKey: ctxKey,
    };
  } catch (error) {
    // Em caso de erro no RBAC, registrar e retornar EMPTY_PERMISSION_SET para manter contrato simples
    // (permite uso direto em callers sem checagens de tipo)
    // eslint-disable-next-line no-console
    console.warn('adaptPermissionsFromRbac: RBAC resolution failed, returning EMPTY_PERMISSION_SET', error);
    return EMPTY_PERMISSION_SET;
  }
}

/**
 * Adapter para múltiplos contextos (batch).
 * 
 * Útil para pré-resolver permissões de vários contextos ao mesmo tempo.
 * 
 * @param rbacService - Serviço RBAC
 * @param claims - Claims da sessão
 * @param contexts - Array de contextos
 * @returns Map de contextKey -> PermissionSetLite
 */
export function adaptPermissionsForMultipleContexts(
  rbacService: PermissionRbacService,
  claims: ClaimsLite | null,
  contexts: ContextLite[]
): Map<string, PermissionSetLite> {
  const result = new Map<string, PermissionSetLite>();

  if (!claims || contexts.length === 0) {
    return result;
  }

  for (const context of contexts) {
    const set = adaptPermissionsFromRbac(rbacService, { claims, context });
    result.set(set.contextKey, set);
  }

  return result;
}
