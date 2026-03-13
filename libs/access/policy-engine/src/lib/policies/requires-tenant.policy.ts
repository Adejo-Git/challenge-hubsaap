/**
 * @file requires-tenant.policy.ts
 * @description Policy that requires a tenant in the context.
 * 
 * GUARDRAIL (Etapa 2):
 * - No deep business logic from Tools
 * - Only generic pre-condition: tenantId presence
 * - Produces stable policyId and reason code
 * - Returns allow if tenant present, deny if absent
 * 
 * Usage:
 * - Enforce tenant selection before accessing multi-tenant features
 * - Guard routes/actions that require tenant context
 */

import type {
  PolicyResult,
  PolicyContextSnapshot,
  PolicySessionSnapshot,
} from '../policy-engine.model';

/**
 * Policy ID for requires-tenant policy.
 */
export const REQUIRES_TENANT_POLICY_ID = 'requiresTenant';

/**
 * Evaluates if tenantId is present in context.
 * 
 * @param context - Context snapshot
 * @param _session - Session snapshot (unused)
 * @param _config - Policy config (unused)
 * @returns PolicyResult with allow/deny decision
 */
export function requiresTenantPolicy(
  context: PolicyContextSnapshot,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _session: PolicySessionSnapshot,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _config?: Record<string, unknown>
): PolicyResult {
  const evaluatedAt = Date.now();

  // If no context, deny
  if (!context) {
    return {
      decision: 'deny',
      policyId: REQUIRES_TENANT_POLICY_ID,
      reason: 'tenantRequired',
      detailsSafe: {
        hasContext: false,
        requiredField: 'tenantId',
      },
      evaluatedAt,
    };
  }

  // If tenantId is missing or empty, deny
  if (!context.tenantId || context.tenantId.trim() === '') {
    return {
      decision: 'deny',
      policyId: REQUIRES_TENANT_POLICY_ID,
      reason: 'tenantRequired',
      detailsSafe: {
        hasContext: true,
        hasTenant: false,
        requiredField: 'tenantId',
      },
      evaluatedAt,
    };
  }

  // Tenant present, allow
  return {
    decision: 'allow',
    policyId: REQUIRES_TENANT_POLICY_ID,
    detailsSafe: {
      hasTenant: true,
    },
    evaluatedAt,
  };
}
