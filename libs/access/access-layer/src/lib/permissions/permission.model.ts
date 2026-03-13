/**
 * @file permission.model.ts
 * @description Modelo "lite" de permissões para o Access Layer.
 * 
 * GUARDRAILS:
 * - Não implementar PolicyEngine/decisão final (isso é AccessDecisionService)
 * - Não fazer HTTP direto
 * - Não expor claims completas/sensíveis via API/logs
 * - Foco em checagem rápida (Set/Map)
 * 
 * Responsabilidades:
 * - Definir PermissionSetLite: estrutura eficiente para lookup de permissões efetivas
 * - Tipos públicos para consumo estável (PermissionKey, ExplainEntry, etc.)
 * - Modelo permite representar permissões por sessão/contexto
 */

import { PermissionKey as PermissionKeyBase, RoleKey as RoleKeyBase } from '@hub/permission-rbac';
import { StandardError } from '@hub/error-model';

/**
 * Re-exporta PermissionKey e RoleKey para consumo no Access Layer.
 */
export type PermissionKey = PermissionKeyBase;
export type RoleKey = RoleKeyBase;

/**
 * PermissionSetLite: conjunto efetivo de permissões do usuário no contexto atual.
 * 
 * Otimizado para lookup rápido usando Set.
 * Não contém detalhes internos do RBAC (isso fica no permission-rbac).
 */
export interface PermissionSetLite {
  /**
   * Set de permissões efetivas (lookup O(1)).
   */
  grants: Set<PermissionKey>;

  /**
   * Roles que geraram essas permissões (informacional, não sensível).
   */
  roles: ReadonlyArray<RoleKey>;

  /**
   * Timestamp da resolução (epoch ms).
   */
  resolvedAt: number;

  /**
   * Chave de contexto que gerou esse set (tenant|client|project|env).
   */
  contextKey: string;
}

/**
 * Snapshot imutável do PermissionSetLite.
 */
export interface PermissionSnapshot {
  readonly grants: ReadonlyArray<PermissionKey>;
  readonly roles: ReadonlyArray<RoleKey>;
  readonly resolvedAt: number;
  readonly contextKey: string;
}

/**
 * Entrada de explicação (opcional, para debug/auditoria).
 * 
 * IMPORTANTE: não deve conter dados sensíveis (claims completas, tokens).
 * Apenas reason codes e metadados seguros.
 */
export interface ExplainEntry {
  /**
   * Código de motivo (ex.: "granted", "missing-permission", "missing-role", "invalid-key").
   */
  reasonCode: string;

  /**
   * Mensagem técnica curta (não sensível).
   */
  message: string;

  /**
   * Detalhes adicionais seguros (ex.: qual permission faltou).
   */
  details?: Record<string, unknown>;
}

/**
 * Erro de resolução de permissões (tipado, sem dados sensíveis).
 * 
 * Retornado quando adaptPermissionsFromRbac falha na resolução RBAC.
 */
export interface PermissionResolutionError {
  /**
   * Flag indicando que isso é um erro.
   */
  isError: true;

  /**
   * Código de razão determinístico (ex.: "INVALID_ROLE_MAP", "UNKNOWN_RBAC_ERROR").
   */
  reasonCode: 'INVALID_ROLE_MAP' | 'UNKNOWN_RBAC_ERROR' | string;

  /**
   * Erro tipado do error-model (sem dados sensíveis).
   */
  error: StandardError;
}

/**
 * Opções para funções de checagem de permissões.
 */
export interface CheckPermissionOptions {
  /**
   * Se true, retorna ExplainEntry com detalhes do motivo.
   */
  explain?: boolean;
}

/**
 * Set vazio padrão (para casos onde sessão não existe ou usuário anônimo).
 */
export const EMPTY_PERMISSION_SET: PermissionSetLite = {
  grants: new Set<PermissionKey>(),
  roles: [],
  resolvedAt: Date.now(),
  contextKey: 'none',
};

/**
 * Converte PermissionSetLite em snapshot imutável.
 */
export function toPermissionSnapshot(set: PermissionSetLite): PermissionSnapshot {
  return {
    grants: Array.from(set.grants),
    roles: [...set.roles],
    resolvedAt: set.resolvedAt,
    contextKey: set.contextKey,
  };
}

/**
 * Valida se uma PermissionKey está no formato esperado.
 * 
 * Formato recomendado: "scope.resource.action" (ex.: "tool.pip.read").
 * Retorna true se válida, false caso contrário.
 */
export function isValidPermissionKeyFormat(key: PermissionKey): boolean {
  if (!key || typeof key !== 'string') return false;
  // Mínimo: 3 segmentos separados por ponto
  const segments = key.split('.');
  return segments.length >= 3 && segments.every(s => s.length > 0);
}
