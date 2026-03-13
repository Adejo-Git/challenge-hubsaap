/**
 * @file access-decision.spec.ts
 * @description Testes mínimos do AccessDecisionService.
 * 
 * Cobertura:
 * - Decisões allow/deny por motivo (UNAUTHENTICATED/DISABLED/FORBIDDEN/CONTEXT_REQUIRED/POLICY_DENIED)
 * - Short-circuit determinístico (ordem de prioridade)
 * - canEnter/canView/canExecute
 * - Requirements extraction e merge
 * - watchDecisions observable
 * 
 * GUARDRAILS:
 * - Não depender de HTTP nem integração real
 * - Usar stubs/mocks de todas as dependências
 */

import { BehaviorSubject, of } from 'rxjs';
import { Route } from '@angular/router';
import {
  AccessDecisionService,
  SessionSource,
  PolicySource,
} from './access-decision.service';
import {
  DenyReason,
  Requirements,
  createAllowDecision,
  createDenyDecision,
} from './access-decision.model';
import {
  extractRequirementsFromRoute,
  mergeRequirements,
  ToolMetadataLite,
} from './access-decision.requirements';
import {
  selectHighestPriorityReason,
  mergeDecisions,
  isCriticalDeny,
  denyReasonToMessage,
} from './access-decision.util';
import { PermissionService } from '../permissions/permission.service';
import { FeatureFlagService } from '../flags/feature-flag.service';
import { ContextService } from '../context/context.service';

/**
 * Mock SessionSource
 */
class MockSessionSource implements SessionSource {
  private subject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.subject.asObservable();

  setAuthenticated(value: boolean): void {
    this.subject.next(value);
  }

  isAuthenticated(): boolean {
    return this.subject.value;
  }
}

/**
 * Mock PolicySource
 */
class MockPolicySource implements PolicySource {
  private policies = new Map<string, boolean>();

  setPolicy(key: string, value: boolean): void {
    this.policies.set(key, value);
  }

  evaluate(policyKey: string): boolean {
    return this.policies.get(policyKey) ?? true;
  }
}

/**
 * Mock PermissionService
 */
class MockPermissionService {
  private permissions = new Set<string>();
  public permissions$ = of({ grants: this.permissions, roles: [], resolvedAt: Date.now(), contextKey: 'test' });

  setPermissions(perms: string[]): void {
    this.permissions.clear();
    perms.forEach((p) => this.permissions.add(p));
  }

  has(key: string): boolean {
    return this.permissions.has(key);
  }

  canAny(keys: string[]): boolean {
    return keys.some((k) => this.permissions.has(k));
  }

  canAll(keys: string[]): boolean {
    return keys.every((k) => this.permissions.has(k));
  }
}

/**
 * Mock FeatureFlagService
 */
class MockFeatureFlagService {
  private flags = new Map<string, boolean>();

  setFlag(key: string, value: boolean): void {
    this.flags.set(key, value);
  }

  isEnabled(key: string): boolean {
    return this.flags.get(key) ?? false;
  }
}

/**
 * Mock ContextService
 */
class MockContextService {
  private currentContext: unknown = null;
  private subject = new BehaviorSubject<unknown>(null);

  context$() {
    return this.subject.asObservable();
  }

  setContextPresent(value: boolean): void {
    this.currentContext = value ? { tenant: 'test' } : null;
  }

  snapshot() {
    return this.currentContext;
  }
}

describe('AccessDecisionService', () => {
  let service: AccessDecisionService;
  let mockSession: MockSessionSource;
  let mockPolicy: MockPolicySource;
  let mockPermission: MockPermissionService;
  let mockFlags: MockFeatureFlagService;
  let mockContext: MockContextService;

  beforeEach(() => {
    mockSession = new MockSessionSource();
    mockPolicy = new MockPolicySource();
    mockPermission = new MockPermissionService();
    mockFlags = new MockFeatureFlagService();
    mockContext = new MockContextService();

    service = new AccessDecisionService(
      mockPermission as unknown as PermissionService,
      mockFlags as unknown as FeatureFlagService,
      mockContext as unknown as ContextService,
      mockSession,
      mockPolicy
    );
  });

  describe('Initialization', () => {
    it('should create service', () => {
      expect(service).toBeTruthy();
    });

    it('should expose decisionsInvalidated$ observable', (done) => {
      service.watchDecisions().subscribe(() => {
        expect(true).toBe(true);
        done();
      });
    });
  });

  describe('canEnter - Authentication', () => {
    it('should deny with UNAUTHENTICATED when requireAuth=true and not authenticated', () => {
      const reqs: Requirements = { requireAuth: true };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(false);
      expect(decision.denyReason).toBe(DenyReason.UNAUTHENTICATED);
      expect(decision.evidence?.checks?.authenticated).toBe(false);
    });

    it('should allow when requireAuth=false', () => {
      const reqs: Requirements = { requireAuth: false };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(true);
      expect(decision.denyReason).toBeUndefined();
    });

    it('should allow when authenticated', () => {
      mockSession.setAuthenticated(true);
      const reqs: Requirements = { requireAuth: true };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(true);
      expect(decision.evidence?.checks?.authenticated).toBe(true);
    });
  });

  describe('canEnter - Context', () => {
    it('should deny with CONTEXT_REQUIRED when requireContext=true and no context', () => {
      mockSession.setAuthenticated(true);
      const reqs: Requirements = { requireAuth: true, requireContext: true };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(false);
      expect(decision.denyReason).toBe(DenyReason.CONTEXT_REQUIRED);
      expect(decision.evidence?.checks?.contextPresent).toBe(false);
    });

    it('should allow when requireContext=true and context present', () => {
      mockSession.setAuthenticated(true);
      mockContext.setContextPresent(true);
      const reqs: Requirements = { requireAuth: true, requireContext: true };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(true);
      expect(decision.evidence?.checks?.contextPresent).toBe(true);
    });
  });

  describe('canEnter - Feature Flags', () => {
    it('should deny with DISABLED when featureFlagKey is false', () => {
      mockSession.setAuthenticated(true);
      mockFlags.setFlag('test.feature', false);
      const reqs: Requirements = { requireAuth: true, featureFlagKey: 'test.feature' };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(false);
      expect(decision.denyReason).toBe(DenyReason.DISABLED);
      expect(decision.evidence?.checks?.flagsEnabled).toBe(false);
    });

    it('should allow when featureFlagKey is true', () => {
      mockSession.setAuthenticated(true);
      mockFlags.setFlag('test.feature', true);
      const reqs: Requirements = { requireAuth: true, featureFlagKey: 'test.feature' };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(true);
      expect(decision.evidence?.checks?.flagsEnabled).toBe(true);
    });
  });

  describe('canEnter - Permissions', () => {
    it('should deny with FORBIDDEN when permissionKey is missing', () => {
      mockSession.setAuthenticated(true);
      const reqs: Requirements = { requireAuth: true, permissionKey: 'test.permission' };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(false);
      expect(decision.denyReason).toBe(DenyReason.FORBIDDEN);
      expect(decision.evidence?.checks?.permissionsGranted).toBe(false);
    });

    it('should allow when permissionKey is granted', () => {
      mockSession.setAuthenticated(true);
      mockPermission.setPermissions(['test.permission']);
      const reqs: Requirements = { requireAuth: true, permissionKey: 'test.permission' };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(true);
      expect(decision.evidence?.checks?.permissionsGranted).toBe(true);
    });

    it('should allow when any permission is granted (canAny)', () => {
      mockSession.setAuthenticated(true);
      mockPermission.setPermissions(['test.read']);
      const reqs: Requirements = {
        requireAuth: true,
        permissionKeys: { keys: ['test.read', 'test.write'], any: true },
      };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(true);
    });

    it('should deny when not all permissions are granted (canAll)', () => {
      mockSession.setAuthenticated(true);
      mockPermission.setPermissions(['test.read']);
      const reqs: Requirements = {
        requireAuth: true,
        permissionKeys: { keys: ['test.read', 'test.write'], any: false },
      };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(false);
      expect(decision.denyReason).toBe(DenyReason.FORBIDDEN);
    });
  });

  describe('canEnter - Policies', () => {
    it('should deny with POLICY_DENIED when policy fails', () => {
      mockSession.setAuthenticated(true);
      mockPolicy.setPolicy('test.policy', false);
      const reqs: Requirements = { requireAuth: true, policyKey: 'test.policy' };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(false);
      expect(decision.denyReason).toBe(DenyReason.POLICY_DENIED);
      expect(decision.evidence?.checks?.policiesPassed).toBe(false);
    });

    it('should allow when policy passes', () => {
      mockSession.setAuthenticated(true);
      mockPolicy.setPolicy('test.policy', true);
      const reqs: Requirements = { requireAuth: true, policyKey: 'test.policy' };
      const decision = service.canEnter('test-route', reqs);

      expect(decision.allow).toBe(true);
      expect(decision.evidence?.checks?.policiesPassed).toBe(true);
    });
  });

  describe('canEnter - Short-circuit order', () => {
    it('should short-circuit at UNAUTHENTICATED before checking flags', () => {
      mockFlags.setFlag('test.feature', false);
      const reqs: Requirements = { requireAuth: true, featureFlagKey: 'test.feature' };
      const decision = service.canEnter('test-route', reqs);

      // Deve parar em UNAUTHENTICATED antes de checar flags
      expect(decision.allow).toBe(false);
      expect(decision.denyReason).toBe(DenyReason.UNAUTHENTICATED);
    });

    it('should short-circuit at DISABLED before checking permissions', () => {
      mockSession.setAuthenticated(true);
      mockFlags.setFlag('test.feature', false);
      const reqs: Requirements = {
        requireAuth: true,
        featureFlagKey: 'test.feature',
        permissionKey: 'test.permission',
      };
      const decision = service.canEnter('test-route', reqs);

      // Deve parar em DISABLED antes de checar permissões
      expect(decision.allow).toBe(false);
      expect(decision.denyReason).toBe(DenyReason.DISABLED);
    });
  });

  describe('canEnterTool', () => {
    it('should evaluate tool with toolKey', () => {
      mockSession.setAuthenticated(true);
      const decision = service.canEnterTool('pip');

      expect(decision.allow).toBe(true);
      expect(decision.evidence?.resourceType).toBe('tool');
    });

    it('should use tool metadata requirements', () => {
      mockSession.setAuthenticated(true);
      mockPermission.setPermissions(['tool.pip.read']);

      const metadata: ToolMetadataLite = {
        key: 'pip',
        permissions: { key: 'tool.pip.read' },
      };

      const decision = service.canEnterTool('pip', metadata);

      expect(decision.allow).toBe(true);
    });
  });

  describe('canView', () => {
    it('should evaluate menu item', () => {
      mockSession.setAuthenticated(true);
      const reqs: Requirements = { requireAuth: true };
      const decision = service.canView('menu.home', reqs);

      expect(decision.allow).toBe(true);
      expect(decision.evidence?.resourceType).toBe('menu');
    });
  });

  describe('canExecute', () => {
    it('should evaluate action', () => {
      mockSession.setAuthenticated(true);
      mockPermission.setPermissions(['action.approve']);
      const reqs: Requirements = { requireAuth: true, permissionKey: 'action.approve' };
      const decision = service.canExecute('approve', reqs);

      expect(decision.allow).toBe(true);
      expect(decision.evidence?.resourceType).toBe('action');
    });
  });
});

describe('access-decision.util', () => {
  describe('selectHighestPriorityReason', () => {
    it('should select NOT_FOUND over others', () => {
      const reasons = [DenyReason.FORBIDDEN, DenyReason.NOT_FOUND, DenyReason.DISABLED];
      const highest = selectHighestPriorityReason(reasons);

      expect(highest).toBe(DenyReason.NOT_FOUND);
    });

    it('should select DISABLED over FORBIDDEN', () => {
      const reasons = [DenyReason.FORBIDDEN, DenyReason.DISABLED];
      const highest = selectHighestPriorityReason(reasons);

      expect(highest).toBe(DenyReason.DISABLED);
    });

    it('should return undefined for empty array', () => {
      const highest = selectHighestPriorityReason([]);
      expect(highest).toBeUndefined();
    });
  });

  describe('mergeDecisions', () => {
    it('should return allow when all are allow', () => {
      const d1 = createAllowDecision();
      const d2 = createAllowDecision();
      const merged = mergeDecisions(d1, d2);

      expect(merged.allow).toBe(true);
    });

    it('should return deny with highest priority reason when any is deny', () => {
      const d1 = createAllowDecision();
      const d2 = createDenyDecision(DenyReason.FORBIDDEN);
      const d3 = createDenyDecision(DenyReason.DISABLED);
      const merged = mergeDecisions(d1, d2, d3);

      expect(merged.allow).toBe(false);
      expect(merged.denyReason).toBe(DenyReason.DISABLED);
    });
  });

  describe('isCriticalDeny', () => {
    it('should return true for NOT_FOUND', () => {
      const decision = createDenyDecision(DenyReason.NOT_FOUND);
      expect(isCriticalDeny(decision)).toBe(true);
    });

    it('should return true for DISABLED', () => {
      const decision = createDenyDecision(DenyReason.DISABLED);
      expect(isCriticalDeny(decision)).toBe(true);
    });

    it('should return true for UNAUTHENTICATED', () => {
      const decision = createDenyDecision(DenyReason.UNAUTHENTICATED);
      expect(isCriticalDeny(decision)).toBe(true);
    });

    it('should return false for FORBIDDEN', () => {
      const decision = createDenyDecision(DenyReason.FORBIDDEN);
      expect(isCriticalDeny(decision)).toBe(false);
    });

    it('should return false for allow', () => {
      const decision = createAllowDecision();
      expect(isCriticalDeny(decision)).toBe(false);
    });
  });

  describe('denyReasonToMessage', () => {
    it('should return message for each reason', () => {
      expect(denyReasonToMessage(DenyReason.NOT_FOUND)).toBe('Recurso não encontrado');
      expect(denyReasonToMessage(DenyReason.DISABLED)).toBe('Recurso desabilitado');
      expect(denyReasonToMessage(DenyReason.UNAUTHENTICATED)).toBe('Autenticação obrigatória');
      expect(denyReasonToMessage(DenyReason.FORBIDDEN)).toBe('Permissões insuficientes');
      expect(denyReasonToMessage(DenyReason.CONTEXT_REQUIRED)).toBe('Contexto obrigatório ausente');
      expect(denyReasonToMessage(DenyReason.POLICY_DENIED)).toBe('Política de acesso negada');
    });
  });
});

describe('access-decision.requirements', () => {
  describe('extractRequirementsFromRoute', () => {
    it('should extract toolKey from route.data', () => {
      const route = { data: { toolKey: 'pip' } } as Route;
      const reqs = extractRequirementsFromRoute(route);

      expect(reqs?.toolKey).toBe('pip');
    });

    it('should extract permissionKey from route.data', () => {
      const route = { data: { permissionKey: 'tool.pip.read' } } as Route;
      const reqs = extractRequirementsFromRoute(route);

      expect(reqs?.permissionKey).toBe('tool.pip.read');
    });

    it('should default requireAuth to true', () => {
      const route = { data: { toolKey: 'pip' } } as Route;
      const reqs = extractRequirementsFromRoute(route);

      expect(reqs?.requireAuth).toBe(true);
    });

    it('should return null for empty route', () => {
      const route = {} as Route;
      const reqs = extractRequirementsFromRoute(route);

      expect(reqs).toBeNull();
    });
  });

  describe('mergeRequirements', () => {
    it('should merge requirements with priority (first wins)', () => {
      const r1: Requirements = { toolKey: 'pip', requireAuth: false };
      const r2: Requirements = { toolKey: 'vp', permissionKey: 'test.perm' };

      const merged = mergeRequirements(r1, r2);

      expect(merged.toolKey).toBe('pip'); // r1 tem prioridade maior (primeiro argumento)
      expect(merged.permissionKey).toBe('test.perm'); // r2 adiciona permissionKey
      expect(merged.requireAuth).toBe(false); // r1 define requireAuth
    });
  });
});
