// libs/access-decision/src/lib/access-decision.service.ts

import {
  AccessAction,
  AccessDecisionDependencies,
  AccessDecisionRequest,
  AccessDecisionResult,
  AccessDenyReason,
  DecisionTarget,
  DecisionContext,
} from './access-decision.model';

/**
 * AccessDecisionService: API central de decisão de acesso.
 *
 * Consolida auth-session, feature-flags, permission-rbac e policy-engine
 * em três métodos públicos: canEnter, canView, canExecute.
 *
 * Ordem determinística de decisão:
 * 1. Autenticação (auth-session)
 * 2. Feature habilitada (feature-flags)
 * 3. Permissão presente (permission-rbac)
 * 4. Policy aprovada (policy-engine)
 *
 * Primeira negação encontrada encerra avaliação com denyReason padronizado.
 */
export class AccessDecisionService {
  constructor(private readonly deps: AccessDecisionDependencies) {}

  canEnter(request: AccessDecisionRequest): AccessDecisionResult {
    return this.decide('enter', request);
  }

  canView(request: AccessDecisionRequest): AccessDecisionResult {
    return this.decide('view', request);
  }

  canExecute(request: AccessDecisionRequest): AccessDecisionResult {
    return this.decide('execute', request);
  }

  private decide(action: AccessAction, request: AccessDecisionRequest): AccessDecisionResult {
    const session = this.deps.authSession.snapshot();
    const requireAuthenticated = request.requireAuthenticated ?? true;
    const requireContext = request.requireContext ?? false;
    const target = request.target;
    const context = request.context;

    if (requireAuthenticated && !session.authenticated) {
      return this.deny(action, 'unauthenticated', target, { session, context });
    }

    if (requireContext && (!request.context || Object.keys(request.context).length === 0)) {
      return this.deny(action, 'contextMissing', target, { session, context });
    }

    // Exemplo: se target é obrigatório e não existe (simulação)
    if (target && !target.key) {
      return this.deny(action, 'notFound', target, { session, context });
    }

    // Fail-closed: if featureKey is required but featureFlags port is missing, deny
    if (request.featureKey) {
      if (!this.deps.featureFlags) {
        return this.deny(action, 'forbidden', target, { session, context });
      }
      if (!this.deps.featureFlags.isEnabled(request.featureKey)) {
        return this.deny(action, 'flagOff', target, { session, context });
      }
    }

    // Fail-closed: if requiredPermission is required but permissionRbac port is missing, deny
    if (request.requiredPermission) {
      if (!this.deps.permissionRbac) {
        return this.deny(action, 'forbidden', target, { session, context });
      }
      if (!this.deps.permissionRbac.hasPermission(request.requiredPermission, session)) {
        return this.deny(action, 'forbidden', target, { session, context });
      }
    }

    // Fail-closed: if policyKey is required but policyEngine port is missing, deny
    if (request.policyKey) {
      if (!this.deps.policyEngine) {
        return this.deny(action, 'forbidden', target, { session, context });
      }

      // Evaluate policy with proper API
      const policyResult = this.deps.policyEngine.evaluate(
        target?.key ?? `${action}.${target?.type ?? 'unknown'}`,
        [{ policyId: request.policyKey }],
        // policyEngine expects context or null, default to null when undefined
        context ?? null,
        {
          sub: session.claims?.['sub'] as string | undefined,
          roles: (session.claims?.['roles'] as string[]) ?? [],
          isAuthenticated: session.authenticated,
        }
      );

      // If policy denies, propagate with reason
      if (policyResult.decision === 'deny') {
        const deniedResult = policyResult.results?.[0];
        const policyReason = deniedResult?.reason ?? 'forbidden';
        
        // Map reason codes from PolicyEngine to AccessDecision reasons
        // contextMissing and projectRequired map to contextMissing
        // other policy denies map to forbidden
        const mappedReason: AccessDenyReason = 
          policyReason === 'contextMissing' || 
          policyReason === 'tenantRequired' ||
          policyReason === 'clientRequired' ||
          policyReason === 'projectRequired'
            ? 'contextMissing'
            : 'forbidden';

        return this.deny(action, mappedReason, target, { session, context });
      }
    }

    const allowed: AccessDecisionResult = {
      action,
      allowed: true,
      target,
      decisionContext: { session, context },
    };

    this.deps.observability?.track('access.allowed', {
      action,
      featureKey: request.featureKey,
      requiredPermission: request.requiredPermission,
      policyKey: request.policyKey,
      target,
    });

    return allowed;
  }

  /**
   * watchDecisions: (Opcional) API reativa para observar decisões.
   * Pode ser implementada para integração com Observables de sessão/contexto/flags.
   * Aqui fornecemos um stub para compatibilidade de contrato.
   */
  watchDecisions(): void {
    // Not implemented: see README for guidance on reatividade.
  }

  private deny(
    action: AccessAction,
    reason: AccessDenyReason,
    target?: DecisionTarget,
    decisionContext?: DecisionContext
  ): AccessDecisionResult {
    const denied: AccessDecisionResult = {
      action,
      allowed: false,
      denyReason: reason,
      target,
      decisionContext,
    };

    this.deps.observability?.track('access.denied', {
      action,
      denyReason: reason,
      target,
    });

    return denied;
  }
}
