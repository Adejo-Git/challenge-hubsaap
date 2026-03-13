/**
 * @file env-is-prod-only.policy.ts
 * @description Policy that restricts access to production environment only.
 * 
 * GUARDRAIL (Etapa 2):
 * - No deep business logic from Tools
 * - Only generic pre-condition: environmentKey check
 * - Produces stable policyId and reason code
 * - Returns allow if env=prod, deny otherwise
 * 
 * Usage:
 * - Guard sensitive operations (e.g., delete production data)
 * - Enforce environment-based restrictions
 * 
 * Configuration:
 * - config.requiredEnv: string (default: 'prod')
 */

import type {
  PolicyResult,
  PolicyContextSnapshot,
  PolicySessionSnapshot,
} from '../policy-engine.model';

/**
 * Policy ID for env-is-prod-only policy.
 */
export const ENV_IS_PROD_ONLY_POLICY_ID = 'envIsProdOnly';

/**
 * Evaluates if environmentKey matches required environment.
 * 
 * @param context - Context snapshot
 * @param _session - Session snapshot (unused)
 * @param config - Policy config (optional: { requiredEnv: 'prod' })
 * @returns PolicyResult with allow/deny decision
 */
export function envIsProdOnlyPolicy(
  context: PolicyContextSnapshot,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _session: PolicySessionSnapshot,
  config?: Record<string, unknown>
): PolicyResult {
  const evaluatedAt = Date.now();
  const requiredEnv = (config?.['requiredEnv'] as string) ?? 'prod';

  // If no context, deny
  if (!context) {
    return {
      decision: 'deny',
      policyId: ENV_IS_PROD_ONLY_POLICY_ID,
      reason: 'envMismatch',
      detailsSafe: {
        hasContext: false,
        requiredEnv,
      },
      evaluatedAt,
    };
  }

  // If environmentKey is missing or doesn't match, deny
  const currentEnv = context.environmentKey ?? '';
  if (currentEnv !== requiredEnv) {
    return {
      decision: 'deny',
      policyId: ENV_IS_PROD_ONLY_POLICY_ID,
      reason: 'envMismatch',
      detailsSafe: {
        hasContext: true,
        currentEnv: currentEnv || 'none',
        requiredEnv,
      },
      evaluatedAt,
    };
  }

  // Environment matches, allow
  return {
    decision: 'allow',
    policyId: ENV_IS_PROD_ONLY_POLICY_ID,
    detailsSafe: {
      currentEnv,
    },
    evaluatedAt,
  };
}
