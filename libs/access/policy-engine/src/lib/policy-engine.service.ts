/**
 * @file policy-engine.service.ts
 * @description PolicyEngine service: evaluate policies based on context/session snapshots.
 * 
 * GUARDRAILS (Etapa 4 + 5):
 * - No HttpClient or IO operations
 * - No session/context state storage → operates on snapshots only
 * - Predictable behavior for unknownPolicyId: deny with unknownPolicyId reason
 * - Result always includes policyId and reason (if deny)
 * - Allow is explicit
 * - Emit minimal observability events on deny (no PII/tokens)
 * - Best-effort observability (failure must not break evaluation)
 * 
 * Responsibilities:
 * - Register built-in policies
 * - Evaluate single policy or multiple policies (composition)
 * - Handle unknownPolicyId gracefully
 * - Emit observability events on deny
 * - Return typed PolicyResult or PolicyCompositionResult
 * 
 * Integration:
 * - Access Decision Service consumes PolicyResult
 * - Guards check result.decision
 * - Observability receives deny events
 */

import { Injectable, Optional } from '@angular/core';
import type {
  PolicyId,
  PolicyTarget,
  PolicyResult,
  PolicyDefinition,
  PolicyCompositionResult,
  PolicyContextSnapshot,
  PolicySessionSnapshot,
  PolicyEvaluator,
  PolicyRegistry,
  CompositionStrategy,
} from './policy-engine.model';
import { DEFAULT_COMPOSITION_STRATEGY } from './policy-engine.model';
import {
  normalizePolicies,
  composePolicyResults,
  createUnknownPolicyResult,
  sanitizeDetails,
} from './policy-engine.util';
import {
  requiresTenantPolicy,
  REQUIRES_TENANT_POLICY_ID,
  requiresClientPolicy,
  REQUIRES_CLIENT_POLICY_ID,
  requiresProjectPolicy,
  REQUIRES_PROJECT_POLICY_ID,
  envIsProdOnlyPolicy,
  ENV_IS_PROD_ONLY_POLICY_ID,
} from './policies';

/**
 * Observability port (façade para evitar acoplamento direto).
 * 
 * Garante que PolicyEngine possa usar qualquer implementação de observabilidade
 * (ObservabilityService, mock, ou stub) sem dependência forte.
 */
export interface ObservabilityPort {
  trackEvent(name: string, properties?: Record<string, unknown>): void;
}

/**
 * PolicyEngine service configuration.
 */
export interface PolicyEngineConfig {
  /**
   * Enable observability (default: true).
   */
  enableObservability?: boolean;

  /**
   * Default composition strategy (default: first-deny).
   */
  defaultStrategy?: CompositionStrategy;
}

/**
 * PolicyEngine service.
 * 
 * Usage:
 * ```typescript
 * const result = policyEngine.evaluate(
 *   'route.tool-pip',
 *   [{ policyId: 'requiresProject' }],
 *   contextSnapshot,
 *   sessionSnapshot
 * );
 * 
 * if (result.decision === 'deny') {
 *   console.log('Denied:', result.reason, result.detailsSafe);
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class PolicyEngineService {
  private registry: PolicyRegistry = new Map();
  private config: PolicyEngineConfig = {
    enableObservability: true,
    defaultStrategy: DEFAULT_COMPOSITION_STRATEGY,
  };
  private observability: ObservabilityPort | null = null;

  constructor(
    @Optional() providedConfig?: PolicyEngineConfig,
    @Optional() observabilityPort?: ObservabilityPort
  ) {
    // Apply provided configuration
    if (providedConfig) {
      this.config = { ...this.config, ...providedConfig };
    }

    // Store observability port (if provided)
    if (observabilityPort) {
      this.observability = observabilityPort;
    }

    // Register built-in policies
    this.registerBuiltInPolicies();
  }

  /**
   * Registers built-in policies.
   * 
   * Built-in policies:
   * - requiresTenant
   * - requiresClient
   * - requiresProject
   * - envIsProdOnly
   */
  private registerBuiltInPolicies(): void {
    this.registerPolicy(REQUIRES_TENANT_POLICY_ID, requiresTenantPolicy);
    this.registerPolicy(REQUIRES_CLIENT_POLICY_ID, requiresClientPolicy);
    this.registerPolicy(REQUIRES_PROJECT_POLICY_ID, requiresProjectPolicy);
    this.registerPolicy(ENV_IS_PROD_ONLY_POLICY_ID, envIsProdOnlyPolicy);
  }

  /**
   * Registers a custom policy evaluator.
   * 
   * @param policyId - Unique policy identifier
   * @param evaluator - Policy evaluator function
   */
  registerPolicy(policyId: PolicyId, evaluator: PolicyEvaluator): void {
    this.registry.set(policyId, evaluator);
  }

  /**
   * Evaluates a single policy or multiple policies.
   * 
   * Behavior:
   * - Empty policies list → allow (no restrictions)
   * - Single policy → evaluate and return single result
   * - Multiple policies → compose using strategy (default: first-deny)
   * - Unknown policyId → deny with unknownPolicyId reason
   * 
   * Observability:
   * - Emit event on deny (minimal, no PII)
   * - Best-effort (failure must not break evaluation)
   * 
   * @param target - Policy target (for traceability)
   * @param policies - Policy definition(s) to evaluate
   * @param context - Context snapshot
   * @param session - Session snapshot
   * @param strategy - Composition strategy (default: first-deny)
   * @returns PolicyCompositionResult
   */
  evaluate(
    target: PolicyTarget,
    policies: PolicyDefinition | PolicyDefinition[],
    context: PolicyContextSnapshot,
    session: PolicySessionSnapshot,
    strategy?: CompositionStrategy
  ): PolicyCompositionResult {
    const normalizedPolicies = normalizePolicies(policies);
    const effectiveStrategy = strategy ?? this.config.defaultStrategy ?? DEFAULT_COMPOSITION_STRATEGY;

    // Empty policies list → allow
    if (normalizedPolicies.length === 0) {
      return {
        decision: 'allow',
        results: [],
        composedAt: Date.now(),
      };
    }

    // Evaluate policies
    const results: PolicyResult[] = [];

    for (const policyDef of normalizedPolicies) {
      const result = this.evaluateSingle(policyDef, context, session);
      results.push(result);

      // Emit observability event on deny
      if (result.decision === 'deny') {
        this.emitDenyEvent(target, result);

        // If strategy is first-deny, stop here (but keep results collected so far)
        if (effectiveStrategy === 'first-deny') {
          break;
        }
      }
    }

    // Compose results (pass all results, not just the deny)
    return composePolicyResults(results, effectiveStrategy);
  }

  /**
   * Evaluates all policies in a list (always uses "all-results" strategy).
   * 
   * Useful for debugging/admin views where you want to see all denials.
   * 
   * @param policies - Policy definitions to evaluate
   * @param context - Context snapshot
   * @param session - Session snapshot
   * @returns PolicyCompositionResult with all results
   */
  evaluateAll(
    policies: PolicyDefinition[],
    context: PolicyContextSnapshot,
    session: PolicySessionSnapshot
  ): PolicyCompositionResult {
    const results: PolicyResult[] = [];

    for (const policyDef of policies) {
      const result = this.evaluateSingle(policyDef, context, session);
      results.push(result);

      // Emit observability event on deny
      if (result.decision === 'deny') {
        this.emitDenyEvent('evaluateAll', result);
      }
    }

    // Compose with all-results strategy
    return composePolicyResults(results, 'all-results');
  }

  /**
   * Evaluates a single policy definition.
   * 
   * @param policyDef - Policy definition
   * @param context - Context snapshot
   * @param session - Session snapshot
   * @returns PolicyResult
   */
  private evaluateSingle(
    policyDef: PolicyDefinition,
    context: PolicyContextSnapshot,
    session: PolicySessionSnapshot
  ): PolicyResult {
    const evaluator = this.registry.get(policyDef.policyId);

    // Unknown policyId → deny
    if (!evaluator) {
      return createUnknownPolicyResult(policyDef.policyId);
    }

    try {
      // Evaluate policy
      const result = evaluator(context, session, policyDef.config);

      // Sanitize details (defense in depth)
      if (result.detailsSafe) {
        result.detailsSafe = sanitizeDetails(result.detailsSafe);
      }

      return result;
    } catch (error) {
      // Policy evaluator threw an error → treat as policyConfigInvalid
      console.error(`[PolicyEngine] Error evaluating policy ${policyDef.policyId}:`, error);

      return {
        decision: 'deny',
        policyId: policyDef.policyId,
        reason: 'policyConfigInvalid',
        detailsSafe: {
          error: 'Policy evaluator threw an exception',
        },
        evaluatedAt: Date.now(),
      };
    }
  }

  /**
   * Emits a minimal observability event on policy deny.
   * 
   * Event name: 'policy.deny'
   * Event payload (safe, no PII):
   * - target: PolicyTarget
   * - policyId: PolicyId
   * - reason: PolicyReason
   * - detailsSafe: sanitized details
   * 
   * Best-effort: if observability fails, log error but do not throw.
   * 
   * @param target - Policy target
   * @param result - PolicyResult (deny)
   */
  private emitDenyEvent(target: PolicyTarget, result: PolicyResult): void {
    if (!this.config.enableObservability || !this.observability) {
      return;
    }

    try {
      this.observability.trackEvent('policy.deny', {
        target,
        policyId: result.policyId,
        reason: result.reason,
        detailsSafe: result.detailsSafe ?? {},
        evaluatedAt: result.evaluatedAt,
      });
    } catch (error) {
      // Log error but do not throw (observability is best-effort)
      console.error('[PolicyEngine] Failed to emit deny event:', error);
    }
  }

  /**
   * Gets the list of registered policy IDs.
   * 
   * Useful for debugging and validation.
   * 
   * @returns Array of registered PolicyIds
   */
  getRegisteredPolicies(): PolicyId[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Checks if a policy is registered.
   * 
   * @param policyId - PolicyId to check
   * @returns true if registered
   */
  isPolicyRegistered(policyId: PolicyId): boolean {
    return this.registry.has(policyId);
  }
}
