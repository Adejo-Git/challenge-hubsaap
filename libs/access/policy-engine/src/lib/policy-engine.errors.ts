/**
 * @file policy-engine.errors.ts
 * @description Error types and mappers for PolicyEngine (compatible with error-model).
 * 
 * GUARDRAILS (Etapa 6 + 7):
 * - No complex exception hierarchy
 * - Map to StandardError from @hub/error-model
 * - Keep surface small and testable
 * - Distinguish: contextMissing vs configError
 * - Reason codes are primary diagnostic mechanism
 * 
 * Responsibilities:
 * - Define PolicyEngineError types
 * - Map PolicyResult/reason to StandardError
 * - Provide helpers for access-decision integration
 * 
 * Usage:
 * - Access Decision Service maps PolicyResult → StandardError
 * - Guards can use reason codes directly (no exception needed)
 * - Only throw errors in exceptional cases (e.g., invalid config during init)
 */

import {
  StandardError,
  ErrorCategory,
  ErrorCode,
  Severity,
} from '@hub/error-model';
import type { PolicyResult, PolicyReason } from './policy-engine.model';

/**
 * Maps PolicyReason to ErrorCode.
 * 
 * Mapping:
 * - contextMissing / tenantRequired / clientRequired / projectRequired → VALIDATION_ERROR
 * - envMismatch → PERMISSION_DENIED
 * - unknownPolicyId / policyConfigInvalid → UNKNOWN_ERROR (dev/config issue)
 * 
 * @param reason - PolicyReason
 * @returns ErrorCode
 */
export function mapReasonToErrorCode(reason: PolicyReason): ErrorCode {
  switch (reason) {
    case 'contextMissing':
    case 'tenantRequired':
    case 'clientRequired':
    case 'projectRequired':
      return ErrorCode.VALIDATION_ERROR;

    case 'envMismatch':
      return ErrorCode.PERMISSION_DENIED;

    case 'unknownPolicyId':
    case 'policyConfigInvalid':
      return ErrorCode.UNKNOWN_ERROR;

    default:
      return ErrorCode.UNKNOWN_ERROR;
  }
}

/**
 * Maps PolicyReason to user-friendly message.
 * 
 * Guidelines:
 * - Clear, actionable messages
 * - No technical jargon (for end users)
 * - Safe for display in UI
 * 
 * @param reason - PolicyReason
 * @returns User-friendly message
 */
export function mapReasonToUserMessage(reason: PolicyReason): string {
  switch (reason) {
    case 'tenantRequired':
      return 'Please select a tenant to continue.';

    case 'clientRequired':
      return 'Please select a client to continue.';

    case 'projectRequired':
      return 'Please select a project to continue.';

    case 'contextMissing':
      return 'Required context is missing. Please complete your selection.';

    case 'envMismatch':
      return 'This action is not available in the current environment.';

    case 'unknownPolicyId':
      return 'Configuration error: unknown policy. Please contact support.';

    case 'policyConfigInvalid':
      return 'Configuration error: invalid policy setup. Please contact support.';

    default:
      return 'Access denied due to policy restrictions.';
  }
}

/**
 * Maps PolicyResult (deny) to StandardError.
 * 
 * Usage:
 * - Access Decision Service converts PolicyResult → StandardError
 * - Error page displays user-friendly message
 * - Observability logs technical details
 * 
 * @param result - PolicyResult (must be deny)
 * @returns StandardError
 */
export function mapPolicyResultToStandardError(
  result: PolicyResult
): StandardError {
  if (result.decision !== 'deny' || !result.reason) {
    throw new Error(
      '[PolicyEngine] mapPolicyResultToStandardError called on non-deny result'
    );
  }

  const errorCode = mapReasonToErrorCode(result.reason);
  const userMessage = mapReasonToUserMessage(result.reason);

  return {
    category:
      errorCode === ErrorCode.VALIDATION_ERROR
        ? ErrorCategory.VALIDATION
        : ErrorCategory.PERMISSION,
    code: errorCode,
    severity:
      errorCode === ErrorCode.VALIDATION_ERROR
        ? Severity.WARNING
        : Severity.ERROR,
    userMessage,
    technicalMessage: `Policy denied: ${result.policyId} - ${result.reason}`,
    detailsSafe: result.detailsSafe,
    timestamp: new Date(result.evaluatedAt).toISOString(),
    source: 'PolicyEngine',
  };
}

/**
 * Custom error class for PolicyEngine configuration errors.
 * 
 * Thrown during initialization if configuration is invalid.
 * Not thrown during policy evaluation (evaluation returns PolicyResult).
 */
export class PolicyEngineConfigError extends Error {
  constructor(message: string) {
    super(`[PolicyEngine] Configuration error: ${message}`);
    this.name = 'PolicyEngineConfigError';
  }
}

/**
 * Helper: checks if PolicyResult represents a deny.
 * 
 * @param result - PolicyResult
 * @returns true if decision is deny
 */
export function isPolicyDenied(result: PolicyResult): boolean {
  return result.decision === 'deny';
}

/**
 * Helper: checks if PolicyResult represents an allow.
 * 
 * @param result - PolicyResult
 * @returns true if decision is allow
 */
export function isPolicyAllowed(result: PolicyResult): boolean {
  return result.decision === 'allow';
}
