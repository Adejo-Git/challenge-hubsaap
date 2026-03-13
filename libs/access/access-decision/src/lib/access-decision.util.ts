// access-decision.util.ts
// Helpers for access-decision: normalization, safe snapshot

import { fromDenyReason, StandardError } from '@hub/error-model';
import { AccessDecisionResult } from './access-decision.model';

export interface DecisionSnapshotSafe {
  action?: string;
  featureKey?: string;
  requiredPermission?: string;
  policyKey?: string;
  denyReason?: string;
}

/**
 * Builds a safe snapshot of a decision, omitting session/context/resource.
 */
export function buildDecisionSnapshotSafe(params: DecisionSnapshotSafe): DecisionSnapshotSafe {
  // Only include allowed fields
  const { action, featureKey, requiredPermission, policyKey, denyReason } = params;
  return { action, featureKey, requiredPermission, policyKey, denyReason };
}

/**
 * Normalizes a decision request, defaulting requireAuthenticated to true.
 */
export function normalizeDecisionRequest<T extends { requireAuthenticated?: boolean }>(req: T): T & { requireAuthenticated: boolean } {
  return {
    ...req,
    requireAuthenticated: req.requireAuthenticated !== false,
  };
}

/**
 * Converts a deny decision into a StandardError using the shared error-model.
 */
export function toDecisionError(result: AccessDecisionResult, correlationId?: string): StandardError | null {
  if (result.allowed || !result.denyReason) return null;
  return fromDenyReason(result.denyReason, correlationId);
}
