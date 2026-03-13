/**
 * @file policy-engine.model.ts
 * @description Core types and contracts for Policy Engine (lightweight ABAC for frontend).
 * 
 * GUARDRAILS (Etapa 1):
 * - PolicyEngine does NOT implement RBAC → delegate to @hub/permission-rbac
 * - PolicyEngine does NOT do IO/HTTP → operates on snapshots only
 * - PolicyEngine does NOT render UI → pure decision logic
 * - PolicyEngine does NOT create complex DSL → simple declarative policies
 * - Details safe: only flags/ids (e.g., hasProject=true/false), NEVER tokens/PII
 * 
 * Responsibilities:
 * - Define PolicyId, PolicyReason, PolicyTarget, PolicyResult
 * - Reason codes: contextMissing, envMismatch, policyConfigInvalid, unknownPolicyId
 * - Ensure safe details (no sensitive data leakage)
 * 
 * Integration points:
 * - Access Decision Service consumes PolicyResult
 * - Guards check PolicyResult.decision
 * - Observability receives minimal events on deny
 * - Error model maps config errors to StandardError
 */

/**
 * Context snapshot for policy evaluation (local copy to avoid non-buildable lib dependency).
 * 
 * Compatible with ContextLite from @hub/access-layer.
 */
export interface PolicyContextLite {
  tenantId: string;
  clientId?: string | null;
  projectId?: string | null;
  environmentKey?: string | null;
}

/**
 * Unique identifier for a policy.
 * 
 * Examples:
 * - "requiresTenant"
 * - "requiresClient"
 * - "requiresProject"
 * - "envIsProdOnly"
 */
export type PolicyId = string;

/**
 * Target for policy evaluation (route, action, resource, etc.).
 * 
 * Examples:
 * - "route.tool-pip"
 * - "action.project.delete"
 * - "resource.report.export"
 * 
 * Used for traceability and observability (not for decision logic).
 */
export type PolicyTarget = string;

/**
 * Standardized reason codes for policy denial.
 * 
 * Guidelines:
 * - Use specific codes for context issues (tenant/client/project missing)
 * - Use envMismatch for environment-based denials
 * - Use dev-focused codes (unknownPolicyId, policyConfigInvalid) for configuration errors
 * - Keep codes stable (they are part of the contract with consumers)
 */
export type PolicyReason =
  | 'contextMissing'          // Required context attribute absent (tenant/client/project)
  | 'tenantRequired'          // Specific: tenant missing
  | 'clientRequired'          // Specific: client missing
  | 'projectRequired'         // Specific: project missing
  | 'envMismatch'             // Environment key does not match requirement
  | 'policyConfigInvalid'     // Policy configuration error (dev)
  | 'unknownPolicyId'         // PolicyId not registered (dev)
  | string;                   // Extensibility for custom policies

/**
 * Decision outcome from policy evaluation.
 */
export type PolicyDecision = 'allow' | 'deny';

/**
 * Safe details for policy results.
 * 
 * CRITICAL: Must NOT include:
 * - Tokens, credentials, or secrets
 * - Full claims objects or session data
 * - PII (Personally Identifiable Information)
 * 
 * MAY include:
 * - Boolean flags (e.g., hasProject: true/false)
 * - Required field names (e.g., requiredField: 'projectId')
 * - Non-sensitive identifiers (e.g., environmentKey: 'dev')
 */
export type PolicyDetailsSafe = Record<string, unknown>;

/**
 * Result of a policy evaluation.
 * 
 * Structure:
 * - decision: allow | deny
 * - policyId: which policy produced this result
 * - reason: why it was denied (only present if decision === 'deny')
 * - detailsSafe: additional context (safe for logging/observability)
 * 
 * Usage:
 * - Access Decision Service aggregates PolicyResults
 * - Guards check result.decision
 * - Observability logs deny events with reason + detailsSafe
 */
export interface PolicyResult {
  /**
   * Policy decision: allow or deny.
   */
  decision: PolicyDecision;

  /**
   * PolicyId that produced this result.
   */
  policyId: PolicyId;

  /**
   * Reason code (only present if decision === 'deny').
   */
  reason?: PolicyReason;

  /**
   * Safe details for logging/observability (no PII/tokens).
   */
  detailsSafe?: PolicyDetailsSafe;

  /**
   * Timestamp of evaluation (milliseconds since epoch).
   */
  evaluatedAt: number;
}

/**
 * Definition of a policy to be evaluated.
 * 
 * Minimal structure:
 * - policyId: which policy to apply
 * - config: optional parameters for the policy (e.g., requiredEnv: 'prod')
 * 
 * Policies are registered and resolved by the PolicyEngineService.
 */
export interface PolicyDefinition {
  /**
   * PolicyId to evaluate.
   */
  policyId: PolicyId;

  /**
   * Optional configuration for the policy.
   * 
   * Examples:
   * - { requiredEnv: 'prod' }
   * - { minContext: 'project' }
   */
  config?: Record<string, unknown>;
}

/**
 * Snapshot of context for policy evaluation.
 * 
 * Immutable snapshot (no live observables/signals).
 * Contains: tenantId, clientId, projectId, environmentKey.
 */
export type PolicyContextSnapshot = PolicyContextLite | null;

/**
 * Snapshot of session for policy evaluation.
 * 
 * Minimal session data (no full claims objects).
 * Contains: sub (user id), roles (array of role keys).
 * 
 * IMPORTANT: Do NOT include full token or sensitive claims.
 */
export interface PolicySessionSnapshot {
  /**
   * User identifier (subject).
   */
  sub?: string | null;

  /**
   * Roles assigned to the user.
   */
  roles?: string[];

  /**
   * Session is authenticated.
   */
  isAuthenticated: boolean;
}

/**
 * Empty session snapshot (for anonymous/unauthenticated users).
 */
export const EMPTY_SESSION_SNAPSHOT: PolicySessionSnapshot = {
  sub: null,
  roles: [],
  isAuthenticated: false,
};

/**
 * Result of evaluating multiple policies (composition).
 * 
 * Strategy: first-deny (recommended for performance and clarity).
 * 
 * Structure:
 * - decision: allow (all passed) | deny (at least one denied)
 * - results: array of individual PolicyResults
 * - deniedBy: policyId of the first policy that denied (if any)
 */
export interface PolicyCompositionResult {
  /**
   * Overall decision (allow if all passed, deny if any failed).
   */
  decision: PolicyDecision;

  /**
   * Individual policy results.
   */
  results: PolicyResult[];

  /**
   * PolicyId of the first policy that denied (if decision === 'deny').
   */
  deniedBy?: PolicyId;

  /**
   * Timestamp of composition (milliseconds since epoch).
   */
  composedAt: number;
}

/**
 * Policy evaluator function signature.
 * 
 * Pure function that takes:
 * - context snapshot
 * - session snapshot
 * - policy config (optional)
 * 
 * Returns: PolicyResult
 * 
 * Guidelines:
 * - Must be synchronous (no async/promises)
 * - Must NOT mutate inputs
 * - Must NOT perform IO (HTTP, localStorage, etc.)
 * - Must produce deterministic output for same inputs
 */
export type PolicyEvaluator = (
  context: PolicyContextSnapshot,
  session: PolicySessionSnapshot,
  config?: Record<string, unknown>
) => PolicyResult;

/**
 * Registry entry for a policy.
 * 
 * Maps PolicyId → PolicyEvaluator.
 */
export interface PolicyRegistryEntry {
  policyId: PolicyId;
  evaluator: PolicyEvaluator;
  description?: string;
}

/**
 * Policy registry (internal to PolicyEngineService).
 * 
 * Maps PolicyId → PolicyEvaluator for lookup.
 */
export type PolicyRegistry = Map<PolicyId, PolicyEvaluator>;

/**
 * List of available policy IDs (for documentation and validation).
 * 
 * Policies:
 * - requiresTenant: Deny if tenantId is missing
 * - requiresClient: Deny if clientId is missing
 * - requiresProject: Deny if projectId is missing
 * - envIsProdOnly: Deny if environmentKey !== 'prod'
 * 
 * Extensibility: Add custom policies by registering new evaluators.
 */
export const AVAILABLE_POLICY_IDS = [
  'requiresTenant',
  'requiresClient',
  'requiresProject',
  'envIsProdOnly',
] as const;

/**
 * Type alias for available policy IDs (for strict typing).
 */
export type AvailablePolicyId = (typeof AVAILABLE_POLICY_IDS)[number];

/**
 * Composition strategy for multiple policies.
 * 
 * - "first-deny": Stop at the first deny (recommended, performant)
 * - "all-results": Evaluate all policies and collect results (verbose, useful for debugging)
 * 
 * Decision record (Etapa 3):
 * - Default: "first-deny" (better UX, clear reason, faster)
 * - Use "all-results" only for debugging/admin views
 */
export type CompositionStrategy = 'first-deny' | 'all-results';

/**
 * Default composition strategy (first-deny).
 * 
 * Rationale:
 * - Stops at first failure (fast)
 * - Provides clear, single reason for denial
 * - Easier to communicate to users
 * - Reduces observability noise
 */
export const DEFAULT_COMPOSITION_STRATEGY: CompositionStrategy = 'first-deny';
