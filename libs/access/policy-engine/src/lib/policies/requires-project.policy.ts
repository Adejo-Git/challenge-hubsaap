/**
 * @file requires-project.policy.ts
 * @description Policy that requires a project in the context.
 * 
 * GUARDRAIL (Etapa 2):
 * - No deep business logic from Tools
 * - Only generic pre-condition: projectId presence
 * - Produces stable policyId and reason code
 * - Returns allow if project present, deny if absent
 * 
 * Usage:
 * - Enforce project selection before accessing project-scoped features
 * - Guard routes/actions that require project context
 * 
 * Example use case (from plan):
 * - Tool PIP requires project context
 * - Guard checks requiresProject policy
 * - If denied with projectRequired reason, show "Select Project" UI
 */

import type {
  PolicyResult,
  PolicyContextSnapshot,
  PolicySessionSnapshot,
} from '../policy-engine.model';

/**
 * Policy ID for requires-project policy.
 */
export const REQUIRES_PROJECT_POLICY_ID = 'requiresProject';

/**
 * Evaluates if projectId is present in context.
 * 
 * @param context - Context snapshot
 * @param _session - Session snapshot (unused)
 * @param _config - Policy config (unused)
 * @returns PolicyResult with allow/deny decision
 */
export function requiresProjectPolicy(
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
      policyId: REQUIRES_PROJECT_POLICY_ID,
      reason: 'projectRequired',
      detailsSafe: {
        hasContext: false,
        requiredField: 'projectId',
      },
      evaluatedAt,
    };
  }

  // If projectId is missing or empty, deny
  if (!context.projectId || context.projectId.trim() === '') {
    return {
      decision: 'deny',
      policyId: REQUIRES_PROJECT_POLICY_ID,
      reason: 'projectRequired',
      detailsSafe: {
        hasContext: true,
        hasProject: false,
        requiredField: 'projectId',
      },
      evaluatedAt,
    };
  }

  // Project present, allow
  return {
    decision: 'allow',
    policyId: REQUIRES_PROJECT_POLICY_ID,
    detailsSafe: {
      hasProject: true,
    },
    evaluatedAt,
  };
}
