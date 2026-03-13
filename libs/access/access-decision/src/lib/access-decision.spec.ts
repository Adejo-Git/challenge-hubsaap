// libs/access-decision/src/lib/access-decision.spec.ts

import {
  AccessDecisionDependencies,
  AuthSessionPort,
  FeatureFlagsPort,
  PermissionRbacPort,
  PolicyEnginePort,
  SessionSnapshot,
} from './access-decision.model';
import { AccessDecisionService } from './access-decision.service';

describe('AccessDecisionService', () => {
  const authenticatedSession: SessionSnapshot = {
    authenticated: true,
    claims: { sub: 'u-1', roles: ['admin'] },
  };

  const unauthenticatedSession: SessionSnapshot = {
    authenticated: false,
  };

  function makeDeps(overrides?: Partial<AccessDecisionDependencies>): AccessDecisionDependencies {
    const authSession: AuthSessionPort = {
      snapshot: () => authenticatedSession,
    };

    const featureFlags: FeatureFlagsPort = {
      isEnabled: () => true,
    };

    const permissionRbac: PermissionRbacPort = {
      hasPermission: () => true,
    };

    const policyEngine: PolicyEnginePort = {
      evaluate: () => ({
        decision: 'allow' as const,
        results: [{ decision: 'allow' as const, policyId: '', evaluatedAt: Date.now() }],
        composedAt: Date.now(),
      }),
    };

    return {
      authSession,
      featureFlags,
      permissionRbac,
      policyEngine,
      ...overrides,
    };
  }

  it('canEnter deve negar quando usuário não está autenticado', () => {
    const service = new AccessDecisionService(
      makeDeps({
        authSession: {
          snapshot: () => unauthenticatedSession,
        },
      }),
    );

    const result = service.canEnter({ requireAuthenticated: true });

    expect(result.allowed).toBe(false);
    expect(result.action).toBe('enter');
    expect(result.denyReason).toBe('unauthenticated');
  });

  it('canView deve permitir quando checks passam', () => {
    const service = new AccessDecisionService(makeDeps());

    const result = service.canView({
      featureKey: 'global.reports',
      requiredPermission: 'reports:view',
      policyKey: 'reports.read',
    });

    expect(result.action).toBe('view');
    expect(result.allowed).toBe(true);
    expect(result.decisionContext?.session?.authenticated).toBe(true);
  });


  it('deve negar com reason flagOff', () => {
    const service = new AccessDecisionService(
      makeDeps({
        featureFlags: {
          isEnabled: () => false,
        },
      }),
    );

    const result = service.canExecute({ featureKey: 'toolA.export' });

    expect(result.allowed).toBe(false);
    expect(result.action).toBe('execute');
    expect(result.denyReason).toBe('flagOff');
  });

  it('deve negar com reason forbidden (permission)', () => {
    const service = new AccessDecisionService(
      makeDeps({
        permissionRbac: {
          hasPermission: () => false,
        },
      }),
    );

    const result = service.canEnter({ requiredPermission: 'admin:manage' });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('forbidden');
  });

  it('deve negar com reason forbidden (policy)', () => {
    const service = new AccessDecisionService(
      makeDeps({
        policyEngine: {
          evaluate: () => ({
            decision: 'deny' as const,
            results: [{ decision: 'deny' as const, policyId: 'tenant.boundary', reason: 'contextMissing', evaluatedAt: Date.now() }],
            deniedBy: 'tenant.boundary',
            composedAt: Date.now(),
          }),
        },
      }),
    );

    const result = service.canView({
      policyKey: 'tenant.boundary',
      context: { tenant: 'A' },
      resource: 'tool:billing',
    });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('contextMissing');
  });

  it('deve manter ordem determinística de negação: feature antes de permission', () => {
    const service = new AccessDecisionService(
      makeDeps({
        featureFlags: { isEnabled: () => false },
        permissionRbac: { hasPermission: () => false },
      }),
    );

    const result = service.canEnter({
      featureKey: 'toolA.export',
      requiredPermission: 'export:run',
    });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('flagOff');
  });

  // ===== Grupo: Precedência completa =====

  it('deve negar por unauthenticated antes de flagOff', () => {
    const service = new AccessDecisionService(
      makeDeps({
        authSession: { snapshot: () => unauthenticatedSession },
        featureFlags: { isEnabled: () => false },
      }),
    );

    const result = service.canEnter({ featureKey: 'toolA.export', requireAuthenticated: true });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('unauthenticated');
  });

  it('deve negar por unauthenticated antes de forbidden (permission)', () => {
    const service = new AccessDecisionService(
      makeDeps({
        authSession: { snapshot: () => unauthenticatedSession },
        permissionRbac: { hasPermission: () => false },
      }),
    );

    const result = service.canView({ requiredPermission: 'admin:manage', requireAuthenticated: true });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('unauthenticated');
  });

  it('deve negar por umauthenticated antes de forbidden (policy)', () => {
    const service = new AccessDecisionService(
      makeDeps({
        authSession: { snapshot: () => unauthenticatedSession },
        policyEngine: {
          evaluate: () => ({
            decision: 'deny' as const,
            results: [{ decision: 'deny' as const, policyId: 'tenant.boundary', reason: 'contextMissing', evaluatedAt: Date.now() }],
            deniedBy: 'tenant.boundary',
            composedAt: Date.now(),
          }),
        },
      }),
    );

    const result = service.canExecute({ policyKey: 'tenant.boundary', requireAuthenticated: true });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('unauthenticated');
  });


  it('deve negar por forbidden (permission) antes de forbidden (policy)', () => {
    const service = new AccessDecisionService(
      makeDeps({
        permissionRbac: { hasPermission: () => false },
        policyEngine: {
          evaluate: () => ({
            decision: 'deny' as const,
            results: [{ decision: 'deny' as const, policyId: 'export.policy', reason: 'contextMissing', evaluatedAt: Date.now() }],
            deniedBy: 'export.policy',
            composedAt: Date.now(),
          }),
        },
      }),
    );

    const result = service.canView({
      requiredPermission: 'export:run',
      policyKey: 'export.policy',
    });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('forbidden');
  });

  // ===== Grupo: Recursos públicos =====

  it('deve permitir acesso quando requireAuthenticated: false', () => {
    const service = new AccessDecisionService(
      makeDeps({
        authSession: { snapshot: () => unauthenticatedSession },
      }),
    );

    const result = service.canView({ requireAuthenticated: false });

    expect(result.allowed).toBe(true);
    expect(result.denyReason).toBeUndefined();
  });

  it('requireAuthenticated: false ainda valida outras checagens', () => {
    const service = new AccessDecisionService(
      makeDeps({
        authSession: { snapshot: () => unauthenticatedSession },
        featureFlags: { isEnabled: () => false },
      }),
    );

    const result = service.canEnter({
      requireAuthenticated: false,
      featureKey: 'toolA.export',
    });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('flagOff');
  });

  // ===== Grupo: Observability =====

  it('deve chamar observability.track quando allow', () => {
    const trackSpy = jest.fn();
    const service = new AccessDecisionService(
      makeDeps({
        observability: { track: trackSpy },
      }),
    );

    service.canEnter({
      featureKey: 'global.reports',
      requiredPermission: 'reports:view',
      policyKey: 'reports.read',
    });

    expect(trackSpy).toHaveBeenCalledWith('access.allowed', {
      action: 'enter',
      featureKey: 'global.reports',
      requiredPermission: 'reports:view',
      policyKey: 'reports.read',
    });
  });

  it('deve chamar observability.track quando deny', () => {
    const trackSpy = jest.fn();
    const service = new AccessDecisionService(
      makeDeps({
        authSession: { snapshot: () => unauthenticatedSession },
        observability: { track: trackSpy },
      }),
    );

    service.canView({ requireAuthenticated: true });

    expect(trackSpy).toHaveBeenCalledWith('access.denied', expect.objectContaining({
      action: 'view',
      denyReason: 'unauthenticated',
    }));
  });

  it('observability.track não deve conter PII', () => {
    const trackSpy = jest.fn();
    const service = new AccessDecisionService(
      makeDeps({
        observability: { track: trackSpy },
      }),
    );

    service.canEnter({
      featureKey: 'toolA.export',
      context: { tenant: 'acme', secret: 'xyz' },
      resource: 'doc:123',
    });

    const payload = trackSpy.mock.calls[0][1];
    expect(payload).not.toHaveProperty('session');
    expect(payload).not.toHaveProperty('claims');
    expect(payload).not.toHaveProperty('context');
    expect(payload).not.toHaveProperty('resource');
  });

  it('service não deve falhar se observability ausente', () => {
    const service = new AccessDecisionService(
      makeDeps({
        observability: undefined,
      }),
    );

    expect(() => {
      service.canEnter({});
    }).not.toThrow();

    const result = service.canEnter({});
    expect(result.allowed).toBe(true);
  });

  // ===== Grupo: Dependências opcionais =====


  it('deve negar com reason forbidden quando featureFlags ausente e featureKey presente', () => {
    const service = new AccessDecisionService(
      makeDeps({
        featureFlags: undefined,
      }),
    );

    const result = service.canEnter({ featureKey: 'toolA.export' });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('forbidden');
  });

  it('deve negar com reason forbidden quando permissionRbac ausente e requiredPermission presente', () => {
    const service = new AccessDecisionService(
      makeDeps({
        permissionRbac: undefined,
      }),
    );

    const result = service.canView({ requiredPermission: 'admin:manage' });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('forbidden');
  });

  it('deve negar com reason forbidden quando policyEngine ausente e policyKey presente', () => {
    const service = new AccessDecisionService(
      makeDeps({
        policyEngine: undefined,
      }),
    );

    const result = service.canExecute({ policyKey: 'tenant.boundary' });

    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('forbidden');
  });


  // ===== Grupo: contextMissing/notFound =====

  it('deve negar com reason contextMissing quando contexto obrigatório está ausente', () => {
    const service = new AccessDecisionService(makeDeps());
    const result = service.canEnter({ requireAuthenticated: true, requireContext: true, context: {} });
    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('contextMissing');
  });

  it('não deve negar com contextMissing quando requireContext não está habilitado (mesmo com context: {})', () => {
    const service = new AccessDecisionService(makeDeps());
    const result = service.canEnter({ requireAuthenticated: true, context: {} });
    expect(result.allowed).toBe(true);
    expect(result.denyReason).toBeUndefined();
  });

  it('deve negar com reason notFound quando target.key está ausente', () => {
    const service = new AccessDecisionService(makeDeps());
    const result = service.canView({ target: { type: 'tool', key: '' } });
    expect(result.allowed).toBe(false);
    expect(result.denyReason).toBe('notFound');
  });

  // ===== Grupo: Consistência da API =====

  it('canEnter/canView/canExecute devem retornar same allowed com diferentes actions', () => {
    const service = new AccessDecisionService(makeDeps());
    const request = { featureKey: 'global.reports' };

    const enterResult = service.canEnter(request);
    const viewResult = service.canView(request);
    const executeResult = service.canExecute(request);

    expect(enterResult.allowed).toBe(true);
    expect(viewResult.allowed).toBe(true);
    expect(executeResult.allowed).toBe(true);

    expect(enterResult.action).toBe('enter');
    expect(viewResult.action).toBe('view');
    expect(executeResult.action).toBe('execute');
  });
});
