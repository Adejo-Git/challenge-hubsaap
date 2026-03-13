/**
 * @file access-decision.model.ts
 * @description Tipos para decisões de acesso no frontend.
 * 
 * GUARDRAILS:
 * - Não expor dados sensíveis em evidências (sem tokens/claims completas)
 * - DenyReason deve ser mapeável para HTTP status (401/403/404)
 * - Decisões devem ser determinísticas e explicáveis
 * 
 * Responsabilidades:
 * - Definir DecisionResult: allow/deny + reason + evidence lite
 * - Definir DenyReason: enum ordenado por prioridade (NOT_FOUND > DISABLED > UNAUTHENTICATED > FORBIDDEN > CONTEXT_REQUIRED)
 * - Definir Requirements: estrutura para extrair requirements de route.data/tool metadata
 */

import { PermissionKey } from '../permissions/permission.model';

/**
 * Resultado de decisão de acesso.
 * 
 * Usado por RouteGuards, NavigationService e UI para decisões
 * canEnter/canView/canExecute.
 */
export interface DecisionResult {
  /**
   * Decisão final: permitir ou negar acesso.
   */
  allow: boolean;

  /**
   * Motivo da decisão (presente quando allow=false).
   */
  denyReason?: DenyReason;

  /**
   * Evidência lite da decisão (não sensível, para debug/telemetria).
   */
  evidence?: EvidenceLite;

  /**
   * Timestamp da decisão (epoch ms).
   */
  timestamp: number;
}

/**
 * Razões de negação ordenadas por prioridade (severidade decrescente).
 * 
 * Ordem determinística para short-circuit:
 * 1. NOT_FOUND: recurso não existe (404)
 * 2. DISABLED: recurso existe mas está desabilitado (404 ou 403 dependendo da policy)
 * 3. UNAUTHENTICATED: usuário não autenticado (401)
 * 4. FORBIDDEN: usuário autenticado mas sem permissões/roles (403)
 * 5. CONTEXT_REQUIRED: contexto obrigatório ausente (403)
 * 6. POLICY_DENIED: política ABAC negou (403)
 */
export enum DenyReason {
  NOT_FOUND = 'NOT_FOUND',
  DISABLED = 'DISABLED',
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  FORBIDDEN = 'FORBIDDEN',
  CONTEXT_REQUIRED = 'CONTEXT_REQUIRED',
  POLICY_DENIED = 'POLICY_DENIED',
}

/**
 * Ordem de prioridade de DenyReason para merge/short-circuit.
 * 
 * Razões anteriores têm prioridade maior (aparecem primeiro).
 */
export const DENY_REASON_PRIORITY: Record<DenyReason, number> = {
  [DenyReason.NOT_FOUND]: 0,
  [DenyReason.DISABLED]: 1,
  [DenyReason.UNAUTHENTICATED]: 2,
  [DenyReason.FORBIDDEN]: 3,
  [DenyReason.CONTEXT_REQUIRED]: 4,
  [DenyReason.POLICY_DENIED]: 5,
};

/**
 * Mapeamento de DenyReason para HTTP status code.
 */
export const DENY_REASON_TO_HTTP_STATUS: Record<DenyReason, number> = {
  [DenyReason.NOT_FOUND]: 404,
  [DenyReason.DISABLED]: 404, // ou 403, depende da policy; defaultamos para 404
  [DenyReason.UNAUTHENTICATED]: 401,
  [DenyReason.FORBIDDEN]: 403,
  [DenyReason.CONTEXT_REQUIRED]: 403,
  [DenyReason.POLICY_DENIED]: 403,
};

/**
 * Evidência lite da decisão (não sensível).
 * 
 * Contém metadados seguros para debug/telemetria.
 */
export interface EvidenceLite {
  /**
   * Tipo de recurso avaliado (route/tool/action/menu).
   */
  resourceType: 'route' | 'tool' | 'action' | 'menu';

  /**
   * Identificador do recurso (path/toolKey/actionKey).
   */
  resourceId: string;

  /**
   * Requirements avaliados (flags/permissions/policies).
   */
  requirements?: Requirements;

  /**
   * Checks realizados (para debug).
   */
  checks?: {
    authenticated?: boolean;
    contextPresent?: boolean;
    flagsEnabled?: boolean;
    permissionsGranted?: boolean;
    policiesPassed?: boolean;
  };

  /**
   * Mensagem técnica (não sensível).
   */
  message?: string;
}

/**
 * Requirements extraídos de route.data, tool metadata ou action maps.
 * 
 * Definem o que é necessário para acessar um recurso.
 */
export interface Requirements {
  /**
   * Tool key (ex.: 'pip', 'vp', 'academy').
   */
  toolKey?: string;

  /**
   * Feature flag key (ex.: 'pip.export', 'global.beta').
   */
  featureFlagKey?: string;

  /**
   * Permissão única obrigatória (short-circuit se não presente).
   */
  permissionKey?: PermissionKey;

  /**
   * Múltiplas permissões (any=true: pelo menos uma; any=false: todas).
   */
  permissionKeys?: {
    keys: PermissionKey[];
    any?: boolean; // padrão: false (todas)
  };

  /**
   * Policy key para avaliação ABAC (ex.: 'context.project.active').
   */
  policyKey?: string;

  /**
   * Contexto obrigatório (true se requer contexto definido).
   */
  requireContext?: boolean;

  /**
   * Autenticação obrigatória (padrão: true).
   */
  requireAuth?: boolean;
}

/**
 * DecisionResult vazio (allow=false, sem reason).
 */
export const EMPTY_DECISION: DecisionResult = {
  allow: false,
  timestamp: Date.now(),
};

/**
 * Helper: cria DecisionResult de allow.
 */
export function createAllowDecision(evidence?: EvidenceLite): DecisionResult {
  return {
    allow: true,
    evidence,
    timestamp: Date.now(),
  };
}

/**
 * Helper: cria DecisionResult de deny.
 */
export function createDenyDecision(
  reason: DenyReason,
  evidence?: EvidenceLite
): DecisionResult {
  return {
    allow: false,
    denyReason: reason,
    evidence,
    timestamp: Date.now(),
  };
}

/**
 * Valida se uma string é um DenyReason válido.
 */
export function isValidDenyReason(reason: string): reason is DenyReason {
  return Object.values(DenyReason).includes(reason as DenyReason);
}
