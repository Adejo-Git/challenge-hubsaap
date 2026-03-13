/**
 * @file policy-engine.spec.ts
 * @description Comprehensive tests for PolicyEngine: policies, service, utilities, and error mapping.
 * 
 * Coverage (as per spec):
 * - Policies básicas (requiresTenant/Client/Project, envIsProdOnly)
 * - Composição (first-deny e all-results)
 * - Determinismo por contexto
 * - Service API (evaluate/evaluateAll)
 * - Utilities (normalizePolicies, composePolicyResults, sanitizeDetails)
 * - Error mapping to StandardError
 * - Observability integration
 * - Safe details (no PII/tokens)
 * 
 * ACCEPTANCE CRITERIA:
 * - AC1: Policies avaliadas deterministicamente com PolicyResult tipado ✓
 * - AC2: AccessDecision pode compor policy-engine com flags/RBAC ✓
 * - AC3: Reason codes padronizados (projectRequired, tenantRequired, etc.) ✓
 * - AC4: Sem IO/HttpClient ✓
 * - AC5: Testes cobrem policies básicas e composição ✓
 * 
 * Total: 60 tests
 */

// Service imports
import { PolicyEngineService, ObservabilityPort } from './policy-engine.service';

// Model imports
import type {
  PolicyContextSnapshot,
  PolicySessionSnapshot,
  PolicyResult,
  PolicyDefinition,
} from './policy-engine.model';
import { EMPTY_SESSION_SNAPSHOT } from './policy-engine.model';

// Utility imports
import {
  normalizePolicies,
  composePolicyResults,
  sanitizeDetails,
  createUnknownPolicyResult,
  createConfigInvalidResult,
  isDenied,
  isAllowed,
  getPrimaryReason,
  getPrimaryDetails,
} from './policy-engine.util';

// Error mapping imports
import {
  mapReasonToErrorCode,
  mapReasonToUserMessage,
  mapPolicyResultToStandardError,
  isPolicyDenied,
  isPolicyAllowed,
  PolicyEngineConfigError,
} from './policy-engine.errors';
import { ErrorCode, ErrorCategory, Severity } from '@hub/error-model';

// Built-in policy imports
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
 * Main test suite for PolicyEngine
 */
describe('PolicyEngine', () => {
  // ==============================================
  // SECTION 1: Built-in Policies
  // ==============================================
  describe('Built-in Policies', () => {
    const validContext: PolicyContextSnapshot = {
      tenantId: 'tenant-123',
      clientId: 'client-456',
      projectId: 'project-789',
      environmentKey: 'dev',
    };

    const session: PolicySessionSnapshot = EMPTY_SESSION_SNAPSHOT;

    describe('requiresTenantPolicy', () => {
      it('should allow when tenant present', () => {
        const result = requiresTenantPolicy(validContext, session);
        expect(result.decision).toBe('allow');
        expect(result.policyId).toBe(REQUIRES_TENANT_POLICY_ID);
        expect(result.detailsSafe).toMatchObject({ hasTenant: true });
      });

      it('should deny when tenant missing', () => {
        const contextNoTenant: PolicyContextSnapshot = {
          ...validContext,
          tenantId: '',
        };
        const result = requiresTenantPolicy(contextNoTenant, session);
        expect(result.decision).toBe('deny');
        expect(result.reason).toBe('tenantRequired');
        expect(result.detailsSafe).toMatchObject({
          hasContext: true,
          hasTenant: false,
          requiredField: 'tenantId',
        });
      });

      it('should deny when context is null', () => {
        const result = requiresTenantPolicy(null, session);
        expect(result.decision).toBe('deny');
        expect(result.reason).toBe('tenantRequired');
        expect(result.detailsSafe).toMatchObject({
          hasContext: false,
        });
      });
    });

    describe('requiresClientPolicy', () => {
      it('should allow when client present', () => {
        const result = requiresClientPolicy(validContext, session);
        expect(result.decision).toBe('allow');
        expect(result.policyId).toBe(REQUIRES_CLIENT_POLICY_ID);
        expect(result.detailsSafe).toMatchObject({ hasClient: true });
      });

      it('should deny when client missing', () => {
        const contextNoClient: PolicyContextSnapshot = {
          ...validContext,
          clientId: null,
        };
        const result = requiresClientPolicy(contextNoClient, session);
        expect(result.decision).toBe('deny');
        expect(result.reason).toBe('clientRequired');
        expect(result.detailsSafe).toMatchObject({
          hasContext: true,
          hasClient: false,
          requiredField: 'clientId',
        });
      });
    });

    describe('requiresProjectPolicy', () => {
      it('should allow when project present', () => {
        const result = requiresProjectPolicy(validContext, session);
        expect(result.decision).toBe('allow');
        expect(result.policyId).toBe(REQUIRES_PROJECT_POLICY_ID);
        expect(result.detailsSafe).toMatchObject({ hasProject: true });
      });

      it('should deny when project missing (ACCEPTANCE: projectRequired reason)', () => {
        const contextNoProject: PolicyContextSnapshot = {
          ...validContext,
          projectId: null,
        };
        const result = requiresProjectPolicy(contextNoProject, session);
        expect(result.decision).toBe('deny');
        expect(result.policyId).toBe(REQUIRES_PROJECT_POLICY_ID);
        expect(result.reason).toBe('projectRequired');
        expect(result.detailsSafe).toMatchObject({
          hasContext: true,
          hasProject: false,
          requiredField: 'projectId',
        });
      });

      it('should deny when project is empty string', () => {
        const contextEmptyProject: PolicyContextSnapshot = {
          ...validContext,
          projectId: '',
        };
        const result = requiresProjectPolicy(contextEmptyProject, session);
        expect(result.decision).toBe('deny');
        expect(result.reason).toBe('projectRequired');
      });
    });

    describe('envIsProdOnlyPolicy', () => {
      it('should allow when environment is prod', () => {
        const prodContext: PolicyContextSnapshot = {
          ...validContext,
          environmentKey: 'prod',
        };
        const result = envIsProdOnlyPolicy(prodContext, session);
        expect(result.decision).toBe('allow');
        expect(result.policyId).toBe(ENV_IS_PROD_ONLY_POLICY_ID);
        expect(result.detailsSafe).toMatchObject({ currentEnv: 'prod' });
      });

      it('should deny when environment is not prod', () => {
        const devContext: PolicyContextSnapshot = {
          ...validContext,
          environmentKey: 'dev',
        };
        const result = envIsProdOnlyPolicy(devContext, session);
        expect(result.decision).toBe('deny');
        expect(result.reason).toBe('envMismatch');
        expect(result.detailsSafe).toMatchObject({
          currentEnv: 'dev',
          requiredEnv: 'prod',
        });
      });

      it('should support custom required environment via config', () => {
        const stagingContext: PolicyContextSnapshot = {
          ...validContext,
          environmentKey: 'staging',
        };
        const result = envIsProdOnlyPolicy(stagingContext, session, {
          requiredEnv: 'staging',
        });
        expect(result.decision).toBe('allow');
      });

      it('should deny when environment is missing', () => {
        const contextNoEnv: PolicyContextSnapshot = {
          ...validContext,
          environmentKey: null,
        };
        const result = envIsProdOnlyPolicy(contextNoEnv, session);
        expect(result.decision).toBe('deny');
        expect(result.reason).toBe('envMismatch');
      });
    });

    describe('Safe details validation', () => {
      it('should never include token or claims', () => {
        const result = requiresProjectPolicy(null, session);
        const keys = Object.keys(result.detailsSafe ?? {});
        expect(keys).not.toContain('token');
        expect(keys).not.toContain('claims');
        expect(keys).not.toContain('password');
        expect(keys).not.toContain('session');
      });
    });
  });

  // ==============================================
  // SECTION 2: PolicyEngineService
  // ==============================================
  describe('PolicyEngineService', () => {
    let service: PolicyEngineService;
    let mockObservability: jest.Mocked<ObservabilityPort>;

    // Test fixtures
    const validContext: PolicyContextSnapshot = {
      tenantId: 'tenant-123',
      clientId: 'client-456',
      projectId: 'project-789',
      environmentKey: 'dev',
    };

    const contextWithoutProject: PolicyContextSnapshot = {
      tenantId: 'tenant-123',
      clientId: 'client-456',
      projectId: null,
      environmentKey: 'dev',
    };

    const contextWithoutTenant: PolicyContextSnapshot = {
      tenantId: '',
      clientId: 'client-456',
      projectId: 'project-789',
      environmentKey: 'dev',
    };

    const validSession: PolicySessionSnapshot = {
      sub: 'user-123',
      roles: ['USER'],
      isAuthenticated: true,
    };

    beforeEach(() => {
      // Create mock observability port
      mockObservability = {
        trackEvent: jest.fn(),
      };

      // Create service with mock observability port
      service = new PolicyEngineService(
        { enableObservability: true, defaultStrategy: 'first-deny' },
        mockObservability
      );
    });

    describe('Built-in policies registration', () => {
      it('should register all built-in policies', () => {
        const registered = service.getRegisteredPolicies();
        expect(registered).toContain('requiresTenant');
        expect(registered).toContain('requiresClient');
        expect(registered).toContain('requiresProject');
        expect(registered).toContain('envIsProdOnly');
      });

      it('should report policy as registered', () => {
        expect(service.isPolicyRegistered('requiresProject')).toBe(true);
        expect(service.isPolicyRegistered('unknownPolicy')).toBe(false);
      });
    });

    describe('Single policy evaluation', () => {
      it('should allow when requiresProject and project present', () => {
        const result = service.evaluate(
          'test.target',
          [{ policyId: 'requiresProject' }],
          validContext,
          validSession
        );

        expect(result.decision).toBe('allow');
        expect(result.results).toHaveLength(1);
        expect(result.results[0].policyId).toBe('requiresProject');
      });

      it('should deny when requiresProject and project missing (ACCEPTANCE: projectRequired reason)', () => {
        const result = service.evaluate(
          'test.target',
          [{ policyId: 'requiresProject' }],
          contextWithoutProject,
          validSession
        );

        expect(result.decision).toBe('deny');
        expect(result.deniedBy).toBe('requiresProject');
        expect(result.results).toHaveLength(1);
        expect(result.results[0].reason).toBe('projectRequired');
        expect(result.results[0].detailsSafe).toMatchObject({
          hasContext: true,
          hasProject: false,
          requiredField: 'projectId',
        });
      });

      it('should allow when requiresTenant and tenant present (ACCEPTANCE: allow case)', () => {
        const result = service.evaluate(
          'test.target',
          [{ policyId: 'requiresTenant' }],
          validContext,
          validSession
        );

        expect(result.decision).toBe('allow');
        expect(result.results[0].policyId).toBe('requiresTenant');
      });

      it('should deny when requiresTenant and tenant missing', () => {
        const result = service.evaluate(
          'test.target',
          [{ policyId: 'requiresTenant' }],
          contextWithoutTenant,
          validSession
        );

        expect(result.decision).toBe('deny');
        expect(result.results[0].reason).toBe('tenantRequired');
      });

      it('should deny for envIsProdOnly when not in prod', () => {
        const result = service.evaluate(
          'test.target',
          [{ policyId: 'envIsProdOnly' }],
          validContext, // env=dev
          validSession
        );

        expect(result.decision).toBe('deny');
        expect(result.results[0].reason).toBe('envMismatch');
        expect(result.results[0].detailsSafe).toMatchObject({
          currentEnv: 'dev',
          requiredEnv: 'prod',
        });
      });

      it('should allow for envIsProdOnly when in prod', () => {
        const prodContext: PolicyContextSnapshot = {
          ...validContext,
          environmentKey: 'prod',
        };

        const result = service.evaluate(
          'test.target',
          [{ policyId: 'envIsProdOnly' }],
          prodContext,
          validSession
        );

        expect(result.decision).toBe('allow');
      });
    });

    describe('Multiple policies composition (ACCEPTANCE: first-deny)', () => {
      it('should allow when all policies pass', () => {
        const result = service.evaluate(
          'test.target',
          [
            { policyId: 'requiresTenant' },
            { policyId: 'requiresClient' },
            { policyId: 'requiresProject' },
          ],
          validContext,
          validSession
        );

        expect(result.decision).toBe('allow');
        expect(result.results).toHaveLength(3);
      });

      it('should deny at first policy that fails (first-deny strategy)', () => {
        const result = service.evaluate(
          'test.target',
          [
            { policyId: 'requiresTenant' }, // pass
            { policyId: 'requiresProject' }, // fail (no project)
            { policyId: 'requiresClient' }, // should not evaluate (first-deny)
          ],
          contextWithoutProject,
          validSession,
          'first-deny'
        );

        expect(result.decision).toBe('deny');
        expect(result.deniedBy).toBe('requiresProject');
        expect(result.results).toHaveLength(2); // Tenant (pass) + Project (fail)
      });

      it('should evaluate all policies with all-results strategy', () => {
        const result = service.evaluate(
          'test.target',
          [
            { policyId: 'requiresTenant' }, // pass
            { policyId: 'requiresProject' }, // fail
            { policyId: 'requiresClient' }, // pass
          ],
          contextWithoutProject,
          validSession,
          'all-results'
        );

        expect(result.decision).toBe('deny');
        expect(result.results).toHaveLength(3); // All evaluated
      });
    });

    describe('Unknown policyId handling (ACCEPTANCE: unknownPolicyId)', () => {
      it('should deny with unknownPolicyId reason', () => {
        const result = service.evaluate(
          'test.target',
          [{ policyId: 'nonExistentPolicy' }],
          validContext,
          validSession
        );

        expect(result.decision).toBe('deny');
        expect(result.results[0].reason).toBe('unknownPolicyId');
        expect(result.results[0].detailsSafe).toMatchObject({
          unknownPolicyId: 'nonExistentPolicy',
        });
      });
    });

    describe('Empty policies list', () => {
      it('should allow when no policies provided (ACCEPTANCE: empty list → allow)', () => {
        const result = service.evaluate(
          'test.target',
          [],
          validContext,
          validSession
        );

        expect(result.decision).toBe('allow');
        expect(result.results).toHaveLength(0);
      });
    });

    describe('Observability integration (ACCEPTANCE: minimal events on deny)', () => {
      it('should emit event on deny', () => {
        service.evaluate(
          'test.target',
          [{ policyId: 'requiresProject' }],
          contextWithoutProject,
          validSession
        );

        expect(mockObservability.trackEvent).toHaveBeenCalledTimes(1);
        expect(mockObservability.trackEvent).toHaveBeenCalledWith(
          'policy.deny',
          expect.objectContaining({
            target: 'test.target',
            policyId: 'requiresProject',
            reason: 'projectRequired',
          })
        );
      });

      it('should not emit event on allow', () => {
        service.evaluate(
          'test.target',
          [{ policyId: 'requiresProject' }],
          validContext,
          validSession
        );

        expect(mockObservability.trackEvent).not.toHaveBeenCalled();
      });

      it('should not throw if observability fails', () => {
        mockObservability.trackEvent.mockImplementation(() => {
          throw new Error('Observability service down');
        });

        expect(() => {
          service.evaluate(
            'test.target',
            [{ policyId: 'requiresProject' }],
            contextWithoutProject,
            validSession
          );
        }).not.toThrow();
      });
    });

    describe('Safe details validation (ACCEPTANCE: no PII/tokens)', () => {
      it('should not include sensitive keys in details', () => {
        const result = service.evaluate(
          'test.target',
          [{ policyId: 'requiresProject' }],
          contextWithoutProject,
          validSession
        );

        const details = result.results[0].detailsSafe;
        expect(details).toBeDefined();
        
        // Should not include token, password, secret, claims, session, etc.
        const keys = Object.keys(details ?? {});
        expect(keys).not.toContain('token');
        expect(keys).not.toContain('password');
        expect(keys).not.toContain('secret');
        expect(keys).not.toContain('claims');
        expect(keys).not.toContain('session');
      });
    });

    describe('evaluateAll method', () => {
      it('should evaluate all policies regardless of denials', () => {
        const result = service.evaluateAll(
          [
            { policyId: 'requiresTenant' },
            { policyId: 'requiresProject' }, // will fail
            { policyId: 'requiresClient' },
          ],
          contextWithoutProject,
          validSession
        );

        expect(result.results).toHaveLength(3);
        expect(result.decision).toBe('deny');
      });
    });
  });

  // ==============================================
  // SECTION 3: Utilities
  // ==============================================
  describe('PolicyEngine Utilities', () => {
    describe('normalizePolicies', () => {
      it('should convert single policy to array', () => {
        const single: PolicyDefinition = { policyId: 'requiresTenant' };
        const result = normalizePolicies(single);
        expect(result).toEqual([single]);
      });

      it('should return array as-is', () => {
        const array: PolicyDefinition[] = [
          { policyId: 'requiresTenant' },
          { policyId: 'requiresProject' },
        ];
        const result = normalizePolicies(array);
        expect(result).toBe(array);
      });
    });

    describe('composePolicyResults', () => {
      const allowResult1: PolicyResult = {
        decision: 'allow',
        policyId: 'policy1',
        evaluatedAt: Date.now(),
      };

      const allowResult2: PolicyResult = {
        decision: 'allow',
        policyId: 'policy2',
        evaluatedAt: Date.now(),
      };

      const denyResult: PolicyResult = {
        decision: 'deny',
        policyId: 'policy3',
        reason: 'projectRequired',
        evaluatedAt: Date.now(),
      };

      it('should return allow for empty results', () => {
        const result = composePolicyResults([]);
        expect(result.decision).toBe('allow');
        expect(result.results).toHaveLength(0);
      });

      it('should return allow when all results are allow', () => {
        const result = composePolicyResults([allowResult1, allowResult2]);
        expect(result.decision).toBe('allow');
        expect(result.results).toHaveLength(2);
      });

      it('should return deny when any result is deny (first-deny)', () => {
        const result = composePolicyResults(
          [allowResult1, denyResult],
          'first-deny'
        );
        expect(result.decision).toBe('deny');
        expect(result.deniedBy).toBe('policy3');
        expect(result.results).toHaveLength(2); // All results up to and including deny
      });

      it('should return all results with all-results strategy', () => {
        const result = composePolicyResults(
          [allowResult1, denyResult, allowResult2],
          'all-results'
        );
        expect(result.decision).toBe('deny');
        expect(result.results).toHaveLength(3);
      });
    });

    describe('sanitizeDetails', () => {
      it('should remove sensitive keys (token, password, secret, etc.)', () => {
        const unsafeDetails = {
          token: 'abc123',
          password: 'secret',
          claims: { sub: '123' },
          hasProject: false,
          requiredField: 'projectId',
        };

        const sanitized = sanitizeDetails(unsafeDetails);
        expect(sanitized).not.toHaveProperty('token');
        expect(sanitized).not.toHaveProperty('password');
        expect(sanitized).not.toHaveProperty('claims');
        expect(sanitized).toHaveProperty('hasProject', false);
        expect(sanitized).toHaveProperty('requiredField', 'projectId');
      });

      it('should only include primitives (string, number, boolean, null)', () => {
        const details = {
          flag: true,
          count: 42,
          name: 'test',
          nothing: null,
          nested: { obj: 'value' },
        };

        const sanitized = sanitizeDetails(details);
        expect(sanitized).toHaveProperty('flag', true);
        expect(sanitized).toHaveProperty('count', 42);
        expect(sanitized).toHaveProperty('name', 'test');
        expect(sanitized).toHaveProperty('nothing', null);
        expect(sanitized).not.toHaveProperty('nested');
      });

      it('should return undefined for undefined input', () => {
        const result = sanitizeDetails(undefined);
        expect(result).toBeUndefined();
      });

      it('should return undefined for empty object after sanitization', () => {
        const result = sanitizeDetails({ token: 'abc', claims: {} });
        expect(result).toBeUndefined();
      });
    });

    describe('createUnknownPolicyResult', () => {
      it('should create deny result with unknownPolicyId reason', () => {
        const result = createUnknownPolicyResult('unknownPolicy');
        expect(result.decision).toBe('deny');
        expect(result.policyId).toBe('unknownPolicy');
        expect(result.reason).toBe('unknownPolicyId');
        expect(result.detailsSafe).toMatchObject({
          unknownPolicyId: 'unknownPolicy',
        });
      });
    });

    describe('createConfigInvalidResult', () => {
      it('should create deny result with policyConfigInvalid reason', () => {
        const result = createConfigInvalidResult('policy1', 'Missing param');
        expect(result.decision).toBe('deny');
        expect(result.policyId).toBe('policy1');
        expect(result.reason).toBe('policyConfigInvalid');
        expect(result.detailsSafe).toMatchObject({
          configError: 'Missing param',
        });
      });
    });

    describe('Helper functions', () => {
      const allowedComposition = {
        decision: 'allow' as const,
        results: [],
        composedAt: Date.now(),
      };

      const deniedComposition = {
        decision: 'deny' as const,
        results: [
          {
            decision: 'deny' as const,
            policyId: 'policy1',
            reason: 'projectRequired' as const,
            detailsSafe: { hasProject: false },
            evaluatedAt: Date.now(),
          },
        ],
        deniedBy: 'policy1',
        composedAt: Date.now(),
      };

      it('isDenied should return true for deny', () => {
        expect(isDenied(deniedComposition)).toBe(true);
        expect(isDenied(allowedComposition)).toBe(false);
      });

      it('isAllowed should return true for allow', () => {
        expect(isAllowed(allowedComposition)).toBe(true);
        expect(isAllowed(deniedComposition)).toBe(false);
      });

      it('getPrimaryReason should return reason from first deny', () => {
        expect(getPrimaryReason(deniedComposition)).toBe('projectRequired');
        expect(getPrimaryReason(allowedComposition)).toBeUndefined();
      });

      it('getPrimaryDetails should return details from first deny', () => {
        expect(getPrimaryDetails(deniedComposition)).toMatchObject({
          hasProject: false,
        });
        expect(getPrimaryDetails(allowedComposition)).toBeUndefined();
      });
    });
  });

  // ==============================================
  // SECTION 4: Error Mapping
  // ==============================================
  describe('PolicyEngine Errors', () => {
    describe('mapReasonToErrorCode', () => {
      it('should map context-related reasons to VALIDATION_ERROR', () => {
        expect(mapReasonToErrorCode('contextMissing')).toBe(ErrorCode.VALIDATION_ERROR);
        expect(mapReasonToErrorCode('tenantRequired')).toBe(ErrorCode.VALIDATION_ERROR);
        expect(mapReasonToErrorCode('clientRequired')).toBe(ErrorCode.VALIDATION_ERROR);
        expect(mapReasonToErrorCode('projectRequired')).toBe(ErrorCode.VALIDATION_ERROR);
      });

      it('should map envMismatch to PERMISSION_DENIED', () => {
        expect(mapReasonToErrorCode('envMismatch')).toBe(ErrorCode.PERMISSION_DENIED);
      });

      it('should map config errors to UNKNOWN_ERROR', () => {
        expect(mapReasonToErrorCode('unknownPolicyId')).toBe(ErrorCode.UNKNOWN_ERROR);
        expect(mapReasonToErrorCode('policyConfigInvalid')).toBe(ErrorCode.UNKNOWN_ERROR);
      });

      it('should default to UNKNOWN_ERROR for unknown reasons', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(mapReasonToErrorCode('customReason' as any)).toBe(ErrorCode.UNKNOWN_ERROR);
      });
    });

    describe('mapReasonToUserMessage', () => {
      it('should provide user-friendly messages', () => {
        expect(mapReasonToUserMessage('tenantRequired')).toContain('tenant');
        expect(mapReasonToUserMessage('clientRequired')).toContain('client');
        expect(mapReasonToUserMessage('projectRequired')).toContain('project');
        expect(mapReasonToUserMessage('envMismatch')).toContain('environment');
      });

      it('should provide support messages for config errors', () => {
        expect(mapReasonToUserMessage('unknownPolicyId')).toContain('support');
        expect(mapReasonToUserMessage('policyConfigInvalid')).toContain('support');
      });

      it('should provide generic message for unknown reasons', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const message = mapReasonToUserMessage('customReason' as any);
        expect(message).toContain('Access denied');
      });
    });

    describe('mapPolicyResultToStandardError', () => {
      it('should map deny result to StandardError', () => {
        const result: PolicyResult = {
          decision: 'deny',
          policyId: 'requiresProject',
          reason: 'projectRequired',
          detailsSafe: { hasProject: false },
          evaluatedAt: Date.now(),
        };

        const error = mapPolicyResultToStandardError(result);
        expect(error.category).toBe(ErrorCategory.VALIDATION);
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.severity).toBe(Severity.WARNING);
        expect(error.userMessage).toContain('project');
        expect(error.technicalMessage).toContain('requiresProject');
        expect(error.detailsSafe).toMatchObject({ hasProject: false });
        expect(error.source).toBe('PolicyEngine');
      });

      it('should throw if called on allow result', () => {
        const result: PolicyResult = {
          decision: 'allow',
          policyId: 'requiresProject',
          evaluatedAt: Date.now(),
        };

        expect(() => mapPolicyResultToStandardError(result)).toThrow(
          'mapPolicyResultToStandardError called on non-deny result'
        );
      });

      it('should handle envMismatch with PERMISSION category', () => {
        const result: PolicyResult = {
          decision: 'deny',
          policyId: 'envIsProdOnly',
          reason: 'envMismatch',
          detailsSafe: { currentEnv: 'dev', requiredEnv: 'prod' },
          evaluatedAt: Date.now(),
        };

        const error = mapPolicyResultToStandardError(result);
        expect(error.category).toBe(ErrorCategory.PERMISSION);
        expect(error.code).toBe(ErrorCode.PERMISSION_DENIED);
        expect(error.severity).toBe(Severity.ERROR);
      });
    });

    describe('Helper functions', () => {
      const allowResult: PolicyResult = {
        decision: 'allow',
        policyId: 'policy1',
        evaluatedAt: Date.now(),
      };

      const denyResult: PolicyResult = {
        decision: 'deny',
        policyId: 'policy2',
        reason: 'projectRequired',
        evaluatedAt: Date.now(),
      };

      it('isPolicyDenied should return true for deny', () => {
        expect(isPolicyDenied(denyResult)).toBe(true);
        expect(isPolicyDenied(allowResult)).toBe(false);
      });

      it('isPolicyAllowed should return true for allow', () => {
        expect(isPolicyAllowed(allowResult)).toBe(true);
        expect(isPolicyAllowed(denyResult)).toBe(false);
      });
    });

    describe('PolicyEngineConfigError', () => {
      it('should create error with proper message', () => {
        const error = new PolicyEngineConfigError('Invalid setup');
        expect(error.message).toContain('PolicyEngine');
        expect(error.message).toContain('Invalid setup');
        expect(error.name).toBe('PolicyEngineConfigError');
      });
    });
  });
});
