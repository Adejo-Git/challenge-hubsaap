/**
 * @file access-decision.util.ts
 * @description Helpers para decisões de acesso.
 * 
 * GUARDRAILS:
 * - Funções puras: mesma entrada → mesma saída
 * - Sem efeitos colaterais (HTTP, storage, console.log)
 * - Validar inputs (null/undefined)
 * 
 * Responsabilidades:
 * - Merge de DenyReasons (prioridade determinística)
 * - Short-circuit helpers (parar early em deny crítico)
 * - Comparação de DecisionResults
 */

import {
  DecisionResult,
  DenyReason,
  DENY_REASON_PRIORITY,
  createAllowDecision,
  createDenyDecision,
} from './access-decision.model';

/**
 * Seleciona o DenyReason com maior prioridade (menor número).
 * 
 * Ordem de prioridade (severidade decrescente):
 * NOT_FOUND > DISABLED > UNAUTHENTICATED > FORBIDDEN > CONTEXT_REQUIRED > POLICY_DENIED
 * 
 * @param reasons - Array de DenyReasons
 * @returns DenyReason com maior prioridade ou undefined se vazio
 */
export function selectHighestPriorityReason(
  reasons: DenyReason[]
): DenyReason | undefined {
  if (!reasons || reasons.length === 0) {
    return undefined;
  }

  let highest: DenyReason | undefined = undefined;
  let highestPriority = Infinity;

  for (const reason of reasons) {
    const priority = DENY_REASON_PRIORITY[reason];
    if (priority !== undefined && priority < highestPriority) {
      highestPriority = priority;
      highest = reason;
    }
  }

  return highest;
}

/**
 * Merge múltiplos DecisionResults em um único resultado.
 * 
 * Se qualquer decisão for deny, retorna deny com o DenyReason de maior prioridade.
 * Se todas forem allow, retorna allow.
 * 
 * @param decisions - Array de DecisionResults
 * @returns DecisionResult merged
 */
export function mergeDecisions(...decisions: DecisionResult[]): DecisionResult {
  if (!decisions || decisions.length === 0) {
    return createAllowDecision();
  }

  const denyReasons: DenyReason[] = [];

  for (const decision of decisions) {
    if (!decision.allow && decision.denyReason) {
      denyReasons.push(decision.denyReason);
    }
  }

  if (denyReasons.length > 0) {
    const highestReason = selectHighestPriorityReason(denyReasons);
    if (!highestReason) {
      return createAllowDecision();
    }
    return createDenyDecision(highestReason);
  }

  return createAllowDecision();
}

/**
 * Short-circuit: retorna true se a decisão é "deny crítico" (deve parar avaliação early).
 * 
 * Crítico: NOT_FOUND, DISABLED, UNAUTHENTICATED (não adianta checar permissões/policies).
 * Não-crítico: FORBIDDEN, CONTEXT_REQUIRED, POLICY_DENIED (continuar para evidências completas).
 * 
 * @param decision - DecisionResult
 * @returns true se deve short-circuit
 */
export function isCriticalDeny(decision: DecisionResult): boolean {
  if (decision.allow) return false;

  const criticalReasons: DenyReason[] = [
    DenyReason.NOT_FOUND,
    DenyReason.DISABLED,
    DenyReason.UNAUTHENTICATED,
  ];

  return !!decision.denyReason && criticalReasons.includes(decision.denyReason);
}

/**
 * Compara dois DecisionResults (igualdade estrutural).
 * 
 * Não compara timestamp nem evidence (apenas allow + denyReason).
 * 
 * @param a - DecisionResult A
 * @param b - DecisionResult B
 * @returns true se equivalentes
 */
export function areDecisionsEqual(a: DecisionResult, b: DecisionResult): boolean {
  if (a.allow !== b.allow) return false;
  if (a.denyReason !== b.denyReason) return false;
  return true;
}

/**
 * Cria DecisionResult de allow com mensagem customizada.
 */
export function allowWithMessage(message: string): DecisionResult {
  return createAllowDecision({
    resourceType: 'route',
    resourceId: '',
    message,
  });
}

/**
 * Cria DecisionResult de deny com mensagem customizada.
 */
export function denyWithMessage(reason: DenyReason, message: string): DecisionResult {
  return createDenyDecision(reason, {
    resourceType: 'route',
    resourceId: '',
    message,
  });
}

/**
 * Helper: checa se uma lista de razões contém alguma razão crítica.
 */
export function hasCriticalReason(reasons: DenyReason[]): boolean {
  return reasons.some((r) =>
    [DenyReason.NOT_FOUND, DenyReason.DISABLED, DenyReason.UNAUTHENTICATED].includes(r)
  );
}

/**
 * Helper: converte DenyReason em mensagem técnica legível.
 * 
 * Não sensível, pode ser logada/exibida em telemetria.
 */
export function denyReasonToMessage(reason: DenyReason): string {
  const messages: Record<DenyReason, string> = {
    [DenyReason.NOT_FOUND]: 'Recurso não encontrado',
    [DenyReason.DISABLED]: 'Recurso desabilitado',
    [DenyReason.UNAUTHENTICATED]: 'Autenticação obrigatória',
    [DenyReason.FORBIDDEN]: 'Permissões insuficientes',
    [DenyReason.CONTEXT_REQUIRED]: 'Contexto obrigatório ausente',
    [DenyReason.POLICY_DENIED]: 'Política de acesso negada',
  };

  return messages[reason] || 'Acesso negado';
}
