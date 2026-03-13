/**
 * @file index.ts
 * @description Exports all available policies for the Policy Engine.
 * 
 * GUARDRAIL (Etapa 2):
 * - Policies must remain generic and reusable
 * - No Tool-specific business logic
 * - All policies follow the PolicyEvaluator signature
 * 
 * Available Policies:
 * - requiresTenant: Deny if tenantId missing
 * - requiresClient: Deny if clientId missing
 * - requiresProject: Deny if projectId missing
 * - envIsProdOnly: Deny if environmentKey !== 'prod'
 */

export {
  requiresTenantPolicy,
  REQUIRES_TENANT_POLICY_ID,
} from './requires-tenant.policy';

export {
  requiresClientPolicy,
  REQUIRES_CLIENT_POLICY_ID,
} from './requires-client.policy';

export {
  requiresProjectPolicy,
  REQUIRES_PROJECT_POLICY_ID,
} from './requires-project.policy';

export {
  envIsProdOnlyPolicy,
  ENV_IS_PROD_ONLY_POLICY_ID,
} from './env-is-prod-only.policy';
