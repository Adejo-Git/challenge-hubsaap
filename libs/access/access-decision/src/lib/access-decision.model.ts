import { DenyReason } from '@hub/error-model';

/**
 * Alvo da decisão: rota, ferramenta, feature, ação.
 */
export type DecisionTarget = {
  type: 'route' | 'tool' | 'feature' | 'action';
  key: string;
};

/**
 * Contexto da decisão: sessão, contexto ativo, flags.
 */
export interface DecisionContext {
  session?: SessionSnapshot;
  context?: Record<string, unknown>;
  flags?: Record<string, boolean>;
}
// libs/access-decision/src/lib/access-decision.model.ts

/**
 * Tipo de ação de acesso sendo avaliada.
 */
export type AccessAction = 'enter' | 'view' | 'execute';

/**
 * Razões padronizadas de negação de acesso.
 */

// Harmonized with spec: unauthenticated, forbidden, flagOff, notFound, contextMissing
export type AccessDenyReason =
  | 'unauthenticated'
  | 'forbidden'
  | 'flagOff'
  | 'notFound'
  | 'contextMissing';

// (Opcional) Assert de compatibilidade com o error-model sem ampliar o contrato:
// garante que os literais acima continuam atribuíveis a DenyReason.
export type _AccessDenyReasonCompat = AccessDenyReason extends DenyReason ? true : never;

/**
 * Request de decisão de acesso.
 */
export interface AccessDecisionRequest {
  featureKey?: string;
  requiredPermission?: string;
  policyKey?: string;
  context?: Record<string, unknown>;
  resource?: string;
  requireAuthenticated?: boolean;
  /**
   * Se true, a decisão deve negar com 'contextMissing' quando context estiver ausente/vazio.
   * Mantém determinismo e evita inferência implícita a partir de context: {}.
   */
  requireContext?: boolean;
  /**
   * Alvo explícito (rota, ferramenta, etc.)
   */
  target?: DecisionTarget;
}

/**
 * Resultado determinístico de decisão de acesso.
 */
export interface AccessDecisionResult {
  action: AccessAction;
  allowed: boolean;
  denyReason?: AccessDenyReason;
  /**
   * Alvo avaliado (rota, ferramenta, etc.)
   */
  target?: DecisionTarget;
  /**
   * Contexto usado na decisão
   */
  decisionContext?: DecisionContext;
}

/**
 * Snapshot mínimo de sessão autenticada.
 */
export interface SessionSnapshot {
  authenticated: boolean;
  claims?: Record<string, unknown>;
}

/**
 * Port: AuthSession (fonte de sessão/claims).
 */
export interface AuthSessionPort {
  snapshot(): SessionSnapshot;
}

/**
 * Port: FeatureFlags (verifica habilitação de feature).
 */
export interface FeatureFlagsPort {
  isEnabled(featureKey: string): boolean;
}

/**
 * Port: PermissionRbac (resolve permissões por role/claim).
 */
export interface PermissionRbacPort {
  hasPermission(permission: string, session: SessionSnapshot): boolean;
}

/**
 * Port: PolicyEngine (avalia políticas declarativas/ABAC).
 * 
 * Expõe a API tipada do PolicyEngineService para composição no AccessDecision.
 * Políticas são avaliadas como lista e resultado é composição determinística 
 * (first-deny) retornando decision + reason codes padronizados.
 */
export interface PolicyEnginePort {
  /**
   * Evaluate one or more policies with composition.
   * 
   * @param target - Policy target (rota, ação, recurso) para traceabilidade
   * @param policies - Policy definition(s) a avaliar
   * @param context - Context snapshot (tenantId, clientId, projectId, etc.)
   * @param session - Session snapshot (sub, roles, isAuthenticated)
   * @returns PolicyCompositionResult com decision + reason codes
   */
  evaluate(
    target: string,
    policies: { policyId: string; config?: Record<string, unknown> } | { policyId: string; config?: Record<string, unknown> }[],
    context: {
      tenantId?: string;
      clientId?: string | null;
      projectId?: string | null;
      environmentKey?: string | null;
    } | null,
    session: {
      sub?: string | null;
      roles?: string[];
      isAuthenticated: boolean;
    }
  ): {
    decision: 'allow' | 'deny';
    results: Array<{
      decision: 'allow' | 'deny';
      policyId: string;
      reason?: string;
      detailsSafe?: Record<string, unknown>;
      evaluatedAt: number;
    }>;
    deniedBy?: string;
    composedAt: number;
  };
}

/**
 * Port: Observability (opcional, registra eventos de acesso).
 */
export interface ObservabilityPort {
  track(event: string, payload: Record<string, unknown>): void;
}

/**
 * Dependências do AccessDecisionService (ports).
 */
export interface AccessDecisionDependencies {
  authSession: AuthSessionPort;
  featureFlags?: FeatureFlagsPort;
  permissionRbac?: PermissionRbacPort;
  policyEngine?: PolicyEnginePort;
  observability?: ObservabilityPort;
}
