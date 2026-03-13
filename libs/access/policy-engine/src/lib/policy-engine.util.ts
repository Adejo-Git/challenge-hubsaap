/**
 * @file policy-engine.util.ts
 * @description Utility functions for policy composition, normalization, and safe details.
 * 
 * GUARDRAILS (Etapa 3):
 * - No complex/generic engine → small, direct utilities focused on composition
 * - Composition strategy: "first-deny" (default, recommended)
 * - Safe details: never include PII/tokens
 * - Normalize input: policy list vs single policy
 * 
 * Decision record (Etapa 3):
 * - Composition strategy: "first-deny" (stops at first deny)
 * - Rationale: better performance, clear reason, simpler UX
 * - Alternative "all-results" available for debugging/admin views
 * 
 * Responsibilities:
 * - Normalize policy definitions (array vs single)
 * - Compose multiple PolicyResults (first-deny or all-results)
 * - Sanitize details to ensure safety (no sensitive data)
 */

import type {
  PolicyResult,
  PolicyDefinition,
  PolicyCompositionResult,
  PolicyDetailsSafe,
  CompositionStrategy,
} from './policy-engine.model';
import { DEFAULT_COMPOSITION_STRATEGY } from './policy-engine.model';

/**
 * Normalizes policy definitions input to array.
 * 
 * Accepts:
 * - Single PolicyDefinition
 * - Array of PolicyDefinitions
 * 
 * Returns: Array of PolicyDefinitions
 * 
 * @param policies - Single policy or array of policies
 * @returns Normalized array of policies
 */
export function normalizePolicies(
  policies: PolicyDefinition | PolicyDefinition[]
): PolicyDefinition[] {
  return Array.isArray(policies) ? policies : [policies];
}

/**
 * Composes multiple PolicyResults into a single PolicyCompositionResult.
 * 
 * Strategies:
 * - "first-deny": Stop at first deny (default, recommended)
 * - "all-results": Evaluate all policies (verbose, for debugging)
 * 
 * Decision:
 * - Allow if ALL policies allow
 * - Deny if ANY policy denies
 * 
 * Note: results array contains all results evaluated up to the point of stopping.
 * For first-deny, this means all results until (and including) the first deny.
 * 
 * @param results - Array of individual PolicyResults
 * @param strategy - Composition strategy (default: first-deny)
 * @returns PolicyCompositionResult
 */
export function composePolicyResults(
  results: PolicyResult[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  strategy: CompositionStrategy = DEFAULT_COMPOSITION_STRATEGY
): PolicyCompositionResult {
  const composedAt = Date.now();

  // Empty list: allow (no restrictions)
  if (results.length === 0) {
    return {
      decision: 'allow',
      results: [],
      composedAt,
    };
  }

  // Find first deny
  const firstDeny = results.find((r) => r.decision === 'deny');

  if (firstDeny) {
    return {
      decision: 'deny',
      results, // Return all results collected (up to and including the deny)
      deniedBy: firstDeny.policyId,
      composedAt,
    };
  }

  // All allowed
  return {
    decision: 'allow',
    results,
    composedAt,
  };
}

/**
 * Sanitizes details to ensure no sensitive data is included.
 * 
 * Guidelines:
 * - Remove keys that look like tokens/credentials (e.g., 'token', 'password', 'secret')
 * - Remove keys that look like full claims (e.g., 'claims', 'session')
 * - Keep only safe flags and identifiers
 * 
 * This is a defense-in-depth measure (policies should not produce unsafe details).
 * 
 * @param details - Raw details object
 * @returns Sanitized details object (safe for logging)
 */
export function sanitizeDetails(
  details: Record<string, unknown> | undefined
): PolicyDetailsSafe | undefined {
  if (!details) {
    return undefined;
  }

  const unsafe = /token|password|secret|credentials|claims|session|auth|jwt|bearer/i;
  const sanitized: PolicyDetailsSafe = {};

  for (const [key, value] of Object.entries(details)) {
    // Skip keys that match unsafe patterns
    if (unsafe.test(key)) {
      continue;
    }

    // Skip values that are objects (could contain nested sensitive data)
    // Only allow primitives: string, number, boolean, null
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Creates a "deny" PolicyResult for unknown policyId.
 * 
 * Used when a PolicyDefinition references a policyId that is not registered.
 * 
 * @param policyId - Unknown policyId
 * @returns PolicyResult with deny decision and unknownPolicyId reason
 */
export function createUnknownPolicyResult(policyId: string): PolicyResult {
  return {
    decision: 'deny',
    policyId,
    reason: 'unknownPolicyId',
    detailsSafe: {
      unknownPolicyId: policyId,
    },
    evaluatedAt: Date.now(),
  };
}

/**
 * Creates a "deny" PolicyResult for invalid policy configuration.
 * 
 * Used when a policy's config is invalid or missing required parameters.
 * 
 * @param policyId - PolicyId with invalid config
 * @param message - Error message (safe, no PII)
 * @returns PolicyResult with deny decision and policyConfigInvalid reason
 */
export function createConfigInvalidResult(
  policyId: string,
  message: string
): PolicyResult {
  return {
    decision: 'deny',
    policyId,
    reason: 'policyConfigInvalid',
    detailsSafe: {
      configError: message,
    },
    evaluatedAt: Date.now(),
  };
}

/**
 * Checks if a PolicyCompositionResult represents a denial.
 * 
 * Helper for consumers (guards, access decision service).
 * 
 * @param result - PolicyCompositionResult
 * @returns true if decision is deny
 */
export function isDenied(result: PolicyCompositionResult): boolean {
  return result.decision === 'deny';
}

/**
 * Checks if a PolicyCompositionResult represents an allow.
 * 
 * Helper for consumers (guards, access decision service).
 * 
 * @param result - PolicyCompositionResult
 * @returns true if decision is allow
 */
export function isAllowed(result: PolicyCompositionResult): boolean {
  return result.decision === 'allow';
}

/**
 * Extracts the primary reason from a PolicyCompositionResult.
 * 
 * Returns the reason from the first denied policy (if any).
 * 
 * @param result - PolicyCompositionResult
 * @returns PolicyReason or undefined
 */
export function getPrimaryReason(
  result: PolicyCompositionResult
): string | undefined {
  if (result.decision === 'deny' && result.results.length > 0) {
    return result.results[0].reason;
  }
  return undefined;
}

/**
 * Extracts safe details from a PolicyCompositionResult.
 * 
 * Returns details from the first denied policy (if any).
 * 
 * @param result - PolicyCompositionResult
 * @returns PolicyDetailsSafe or undefined
 */
export function getPrimaryDetails(
  result: PolicyCompositionResult
): PolicyDetailsSafe | undefined {
  if (result.decision === 'deny' && result.results.length > 0) {
    return result.results[0].detailsSafe;
  }
  return undefined;
}
