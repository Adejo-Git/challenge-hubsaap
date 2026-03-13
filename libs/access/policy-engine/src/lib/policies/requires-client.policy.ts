/**
 * @file requires-client.policy.ts
 * @description Policy that requires a client in the context.
 * 
 * GUARDRAIL (Etapa 2):
 * - No deep business logic from Tools
 * - Only generic pre-condition: clientId presence
 * - Produces stable policyId and reason code
 * - Returns allow if client present, deny if absent
 * 
 * Usage:
 * - Enforce client selection before accessing client-scoped features
 * - Guard routes/actions that require client context
 */

import type {
  PolicyResult,
  PolicyContextSnapshot,
  PolicySessionSnapshot,
} from '../policy-engine.model';

/**
 * Policy ID for requires-client policy.
 */
export const REQUIRES_CLIENT_POLICY_ID = 'requiresClient';

/**
 * Evaluates if clientId is present in context.
 * 
 * @param context - Context snapshot
 * @param _session - Session snapshot (unused)
 * @param _config - Policy config (unused)
 * @returns PolicyResult with allow/deny decision
 */
export function requiresClientPolicy(
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
      policyId: REQUIRES_CLIENT_POLICY_ID,
      reason: 'clientRequired',
      detailsSafe: {
        hasContext: false,
        requiredField: 'clientId',
      },
      evaluatedAt,
    };
  }

  // If clientId is missing or empty, deny
  if (!context.clientId || context.clientId.trim() === '') {
    return {
      decision: 'deny',
      policyId: REQUIRES_CLIENT_POLICY_ID,
      reason: 'clientRequired',
      detailsSafe: {
        hasContext: true,
        hasClient: false,
        requiredField: 'clientId',
      },
      evaluatedAt,
    };
  }

  // Client present, allow
  return {
    decision: 'allow',
    policyId: REQUIRES_CLIENT_POLICY_ID,
    detailsSafe: {
      hasClient: true,
    },
    evaluatedAt,
  };
}
