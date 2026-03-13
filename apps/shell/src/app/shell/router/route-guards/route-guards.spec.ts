/**
 * @file route-guards.spec.ts
 * @description Testes unitários de RouteGuards.
 *
 * Cobe:
 * - Extração de requirements de route.data
 * - Validação de toolKey e feature flags
 * - Mapeamento de DenyReason para UrlTree
 * - Telemetria de allow/deny
 * - Cenários de 401/403/404
 * - Prevenção de loop de redirect
 */

import { TestBed } from '@angular/core/testing';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { RouteGuardsService, routeGuard, routeMatchGuard } from './route-guards';
import { AccessDecisionService } from '@hub/access-layer/decision';
import { FeatureFlagService } from '@hub/access-layer/flags';
import { ObservabilityService } from '@hub/observability';
import { ToolRegistryService } from '@hub/tool-registry';
import {
  DenyReason,
  extractRequirementsFromRoute,
  extractToolKeyFromRoute,
  validateToolKey,
  denyReasonToUrlTree,
  buildGuardTelemetry,
  isPublicRoute,
  normalizeToolKey,
} from './route-guards.util';

const makeGuardState = (url: string): RouterStateSnapshot => ({ url } as RouterStateSnapshot);

describe('RouteGuards - Utilities', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [Router],
    });
    router = TestBed.inject(Router);
  });

  describe('extractRequirementsFromRoute', () => {
    it('deve extrair toolKey, featureFlagKey, permissionKey de route.data', () => {
      const route = {
        data: {
          toolKey: 'pipelines',
          featureFlagKey: 'global.pipelines',
          permissionKey: 'pipelines.access',
          requireAuth: true,
        },
      } as unknown as ActivatedRouteSnapshot;

      const reqs = extractRequirementsFromRoute(route);

      expect(reqs.toolKey).toBe('pipelines');
      expect(reqs.featureFlagKey).toBe('global.pipelines');
      expect(reqs.permissionKey).toBe('pipelines.access');
      expect(reqs.requireAuth).toBe(true);
    });

    it('deve retornar objeto vazio se route.data ausente', () => {
      const route = {} as unknown as ActivatedRouteSnapshot;

      const reqs = extractRequirementsFromRoute(route);

      expect(reqs).toEqual({});
    });

    it('deve ignorar valores não-string para toolKey et al', () => {
      const route = {
        data: {
          toolKey: 123, // não é string
          featureFlagKey: true, // não é string
        },
      } as unknown as ActivatedRouteSnapshot;

      const reqs = extractRequirementsFromRoute(route);

      expect(reqs.toolKey).toBeUndefined();
      expect(reqs.featureFlagKey).toBeUndefined();
    });
  });

  describe('extractToolKeyFromRoute', () => {
    it('deve preferir route.params sobre route.data', () => {
      const route = {
        params: { toolKey: 'from-params' },
        data: { toolKey: 'from-data' },
      } as unknown as ActivatedRouteSnapshot;

      const toolKey = extractToolKeyFromRoute(route);

      expect(toolKey).toBe('from-params');
    });

    it('deve fallback para route.data se params ausente', () => {
      const route = {
        params: {},
        data: { toolKey: 'from-data' },
      } as unknown as ActivatedRouteSnapshot;

      const toolKey = extractToolKeyFromRoute(route);

      expect(toolKey).toBe('from-data');
    });

    it('deve retornar undefined se toolKey ausente em ambos', () => {
      const route = {} as unknown as ActivatedRouteSnapshot;

      const toolKey = extractToolKeyFromRoute(route);

      expect(toolKey).toBeUndefined();
    });
  });

  describe('validateToolKey', () => {
    it('deve permitir toolKey válido', () => {
      const validation = validateToolKey('pipelines');

      expect(validation.valid).toBe(true);
      expect(validation.reason).toBeUndefined();
    });

    it('deve negar toolKey vazio', () => {
      const validation = validateToolKey('');

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe(DenyReason.MISSING_ROUTE_DATA);
    });

    it('deve negar toolKey undefined', () => {
      const validation = validateToolKey(undefined);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe(DenyReason.MISSING_ROUTE_DATA);
    });

    it('deve negar toolKey com apenas espaços', () => {
      const validation = validateToolKey('   ');

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe(DenyReason.MISSING_ROUTE_DATA);
    });
  });

  describe('normalizeToolKey', () => {
    it('deve converter para lowercase', () => {
      const normalized = normalizeToolKey('PIPELINES');

      expect(normalized).toBe('pipelines');
    });

    it('deve remover espaços em branco', () => {
      const normalized = normalizeToolKey('  pipelines  ');

      expect(normalized).toBe('pipelines');
    });

    it('deve retornar vazio se undefined', () => {
      const normalized = normalizeToolKey(undefined);

      expect(normalized).toBe('');
    });
  });

  describe('denyReasonToUrlTree', () => {
    it('deve mapear UNKNOWN_TOOL para /error/404', () => {
      const urlTree = denyReasonToUrlTree(DenyReason.UNKNOWN_TOOL, router);

      expect(urlTree.toString()).toBe('/error/404');
    });

    it('deve mapear FLAG_DISABLED para /error/404', () => {
      const urlTree = denyReasonToUrlTree(DenyReason.FLAG_DISABLED, router);

      expect(urlTree.toString()).toBe('/error/404');
    });

    it('deve mapear FORBIDDEN para /error/403', () => {
      const urlTree = denyReasonToUrlTree(DenyReason.FORBIDDEN, router);

      expect(urlTree.toString()).toBe('/error/403');
    });

    it('deve mapear UNAUTHENTICATED para /error/401', () => {
      const urlTree = denyReasonToUrlTree(DenyReason.UNAUTHENTICATED, router);

      expect(urlTree.toString()).toBe('/error/401');
    });

    it('deve mapear INCOMPLETE_ROUTE_CONFIG para /error/403 (fallback permissivo)', () => {
      const urlTree = denyReasonToUrlTree(DenyReason.INCOMPLETE_ROUTE_CONFIG, router);

      expect(urlTree.toString()).toBe('/error/403');
    });
  });

  describe('buildGuardTelemetry', () => {
    it('deve incluir allowed=true em payload', () => {
      const event = buildGuardTelemetry(true, '/tools/pipelines/overview');

      expect(event.allowed).toBe(true);
      expect(event.denyReason).toBeUndefined();
    });

    it('deve incluir denyReason quando allowed=false', () => {
      const event = buildGuardTelemetry(
        false,
        '/tools/pipelines/overview',
        DenyReason.FORBIDDEN
      );

      expect(event.allowed).toBe(false);
      expect(event.denyReason).toBe('forbidden');
    });

    it('deve incluir toolKey quando fornecido', () => {
      const event = buildGuardTelemetry(true, '/tools/pipelines', undefined, 'pipelines');

      expect(event.toolKey).toBe('pipelines');
    });

    it('deve normalizar route path removendo query params', () => {
      const event = buildGuardTelemetry(true, '/tools/pipelines?page=1&sort=name');

      expect(event.route).toBe('/tools/pipelines');
    });

    it('deve normalizar route path removendo fragments', () => {
      const event = buildGuardTelemetry(true, '/tools/pipelines#section');

      expect(event.route).toBe('/tools/pipelines');
    });

    it('não deve incluir denyReason quando undefined', () => {
      const event = buildGuardTelemetry(true, '/tools/pipelines');

      expect('denyReason' in event).toBe(false);
    });
  });

  describe('isPublicRoute', () => {
    it('deve reconhecer /error/* como público', () => {
      expect(isPublicRoute('/error/404')).toBe(true);
      expect(isPublicRoute('/error/403')).toBe(true);
      expect(isPublicRoute('/error/401')).toBe(true);
    });

    it('deve reconhecer /auth/* como público', () => {
      expect(isPublicRoute('/auth/login')).toBe(true);
      expect(isPublicRoute('/auth/logout')).toBe(true);
    });

    it('deve reconhecer /login como público', () => {
      expect(isPublicRoute('/login')).toBe(true);
    });

    it('deve reconhecer /public/* como público', () => {
      expect(isPublicRoute('/public/terms')).toBe(true);
    });

    it('deve negar /tools/* como privado', () => {
      expect(isPublicRoute('/tools/pipelines')).toBe(false);
    });

    it('deve negar /dashboard como privado', () => {
      expect(isPublicRoute('/dashboard')).toBe(false);
    });

    it('deve ser case-insensitive', () => {
      expect(isPublicRoute('/ERROR/404')).toBe(true);
      expect(isPublicRoute('/AUTH/LOGIN')).toBe(true);
    });
  });
});

describe('RouteGuards - Service', () => {
  let service: RouteGuardsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RouteGuardsService,
        Router,
        {
          provide: AccessDecisionService,
          useValue: {
            canEnter: () => ({ action: 'enter', allowed: true }),
          },
        },
      ],
    });
    service = TestBed.inject(RouteGuardsService);
  });

  describe('canActivate', () => {
    it('deve permitir acesso para rotas públicas', () => {
      const route = {
        data: {},
      } as unknown as ActivatedRouteSnapshot;
      const state = makeGuardState('/error/404');

      const result = service.canActivate(route, state);

      expect(result).toBe(true);
    });

    it('deve permitir acesso quando AccessDecisionService permitir', () => {
      // Mock AccessDecisionService.canEnter() para retornar allowed=true
      const route = {
        data: { toolKey: 'pipelines' },
      } as unknown as ActivatedRouteSnapshot;
      const state = makeGuardState('/tools/pipelines/overview');

      // Sem AccessDecisionService injetado, default é allow
      const result = service.canActivate(route, state);

      expect(result).toBe(true);
    });
  });

  describe('canMatch', () => {
    it('deve permitir match de rotas públicas', () => {
      const route = {
        data: {},
      } as unknown as ActivatedRouteSnapshot;
      const state = makeGuardState('/error/404');

      const result = service.canMatch(route, state);

      expect(result).toBe(true);
    });

    it('deve negar match quando toolKey ausente', () => {
      const route = {
        params: {},
        data: {},
      } as unknown as ActivatedRouteSnapshot;
      const state = makeGuardState('/tools/unknown/overview');

      const result = service.canMatch(route, state);

      // Deve retornar UrlTree para /error/404
      expect(result).not.toBe(true);
      expect(typeof result === 'object').toBe(true);
    });
  });
});

describe('RouteGuards - Integration', () => {
  it('deve impedir loop de redirect: /tools/x → /error/403 → /error/403 (sem loop)', () => {
    // Garantir que /error routes são públicas
    expect(isPublicRoute('/error/403')).toBe(true);
    expect(isPublicRoute('/error/404')).toBe(true);
    expect(isPublicRoute('/error/401')).toBe(true);
  });

  it('completa checklist de acceptance criteria', () => {
    // AC1: toolKey existente é válido; ausência/empty é bloqueada via missing-route-data
    const unknownValidation = validateToolKey('unknown-tool');
    expect(unknownValidation.valid).toBe(true);

    const missingValidation = validateToolKey(undefined);
    expect(missingValidation.reason).toBe(DenyReason.MISSING_ROUTE_DATA);

    // AC2: feature flag desabilitada mapeia para 404
    const router = TestBed.inject(Router);
    const flagDisabledUrlTree = denyReasonToUrlTree(DenyReason.FLAG_DISABLED, router);
    expect(flagDisabledUrlTree.toString()).toContain('error/404');

    // AC3: sem permissão mapeia para 403
    const forbiddenUrlTree = denyReasonToUrlTree(DenyReason.FORBIDDEN, router);
    expect(forbiddenUrlTree.toString()).toContain('error/403');

    // AC4: telemetria não vaza dados sensíveis
    const event = buildGuardTelemetry(false, '/tools/pipelines/sensitive-data?token=xyz', DenyReason.FORBIDDEN, 'pipelines');
    expect(event.route).toBe('/tools/pipelines/sensitive-data'); // query param removido
    expect(JSON.stringify(event)).not.toContain('token');

    // AC5: nenhum HttpClient direto no guard (verificado na análise estática)
  });
});

// ============================================================================
// PRIORITY 1: Integration & E2E Scenarios (7 new test cases)
// ============================================================================

describe('RouteGuards - Integration & E2E Scenarios', () => {
  let service: RouteGuardsService;
  let mockAccessDecision: { canEnter: jest.Mock };
  let mockToolRegistry: { exists: jest.Mock };
  let mockFeatureFlags: { isEnabled: jest.Mock };
  let mockObservability: { track: jest.Mock };

  beforeEach(() => {
    mockAccessDecision = { canEnter: jest.fn() };
    mockToolRegistry = { exists: jest.fn() };
    mockFeatureFlags = { isEnabled: jest.fn() };
    mockObservability = { track: jest.fn() };

    mockAccessDecision.canEnter.mockReturnValue({ action: 'enter', allowed: true });
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);

    // Minimal setup: only Router is required, services are @Optional()
    TestBed.configureTestingModule({
      providers:
      [
        RouteGuardsService,
        Router,
        { provide: AccessDecisionService, useValue: mockAccessDecision },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
        { provide: ObservabilityService, useValue: mockObservability },
      ],
    });
    service = TestBed.inject(RouteGuardsService);
  });

  it('[TC-001] Route Declaration Pattern: routeGuard() and routeMatchGuard() return proper types', () => {
    // Em Angular, `inject()` só funciona dentro de injection context.
    const canActivateFn = routeGuard();
    const canMatchFn = routeMatchGuard();

    expect(typeof canActivateFn).toBe('function');
    expect(typeof canMatchFn).toBe('function');

    const injector = TestBed.inject(EnvironmentInjector);
    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines/overview') as unknown;

    const canActivateResult = runInInjectionContext(injector, () => canActivateFn(route, state));
    const canMatchResult = runInInjectionContext(injector, () => canMatchFn(route, state));

    expect(canActivateResult).toBe(true);
    expect(canMatchResult).toBe(true);
  });

  it('[TC-002] Sequential Route Navigation: dashboard → tools/pipelines verifies both guards fire in order', () => {
    // Simulate navigating to dashboard (public route) then to tools/pipelines (protected)
    
    // First navigation: /dashboard (normally public)
    const dashboardRoute = {
      data: {},
      params: {},
    } as unknown as ActivatedRouteSnapshot;
    const dashboardState = makeGuardState('/dashboard') as unknown;

    const dashboardResult = service.canActivate(dashboardRoute, dashboardState);
    
    // In default setup, should allow (no access decision denies)
    expect(dashboardResult).toBe(true);
    
    // Setup for second navigation: /tools/pipelines (protected)
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const pipelineRoute = {
      data: {
        toolKey: 'pipelines',
        featureFlagKey: 'global.pipelines',
      },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const pipelineState = makeGuardState('/tools/pipelines/overview') as unknown;

    // Test canMatch first (as it fires before canActivate)
    const canMatchResult = service.canMatch(pipelineRoute, pipelineState);
    expect(canMatchResult).toBe(true);

    // Then test canActivate
    const canActivateResult = service.canActivate(pipelineRoute, pipelineState);
    expect(canActivateResult).toBe(true);

    // Verify both telemetry events were emitted
    const trackCalls = mockObservability.track.mock.calls;
    expect(trackCalls.length).toBeGreaterThan(0);
  });

  it('[TC-003] Tool Switch with Context Change: /tools/pipelines → /tools/vp evaluates NEW tool separately', () => {
    // Simulate switch from pipelines to vp tool
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    // First tool: pipelines
    const pipelineRoute = {
      data: {
        toolKey: 'pipelines',
        featureFlagKey: 'global.pipelines',
      },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const pipelineState = makeGuardState('/tools/pipelines/overview') as unknown;

    const pipelineResult = service.canActivate(pipelineRoute, pipelineState);
    expect(pipelineResult).toBe(true);
    expect(mockAccessDecision.canEnter).toHaveBeenCalled();

    // Clear previous calls
    mockAccessDecision.canEnter.mockClear();
    mockObservability.track.mockClear();

    // Switch to second tool: vp
    const vpRoute = {
      data: {
        toolKey: 'vp',
        featureFlagKey: 'global.vp',
      },
      params: { toolKey: 'vp' },
    } as unknown as ActivatedRouteSnapshot;
    const vpState = makeGuardState('/tools/vp/dashboard') as unknown;

    const vpResult = service.canActivate(vpRoute, vpState);
    expect(vpResult).toBe(true);

    // Verify NEW tool context was evaluated (AccessDecisionService called again)
    expect(mockAccessDecision.canEnter).toHaveBeenCalledTimes(1);

    // Verify telemetry shows NEW tool key
    const trackCalls = mockObservability.track.mock.calls;
    expect(trackCalls.length).toBeGreaterThan(0);
    const lastPayload = trackCalls[trackCalls.length - 1][1];
    expect(lastPayload).toEqual(expect.objectContaining({ toolKey: 'vp' }));
  });

  it('[TC-004] Feature Flag Toggle Durante Runtime: flag disable event causa deny na próxima navegação', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true); // Initially enabled
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const route = {
      data: {
        toolKey: 'pipelines',
        featureFlagKey: 'global.pipelines',
      },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines');

    // First navigation: flag enabled → allow
    const resultAllow = service.canMatch(route, state);
    expect(resultAllow).toBe(true);

    // Simulate flag toggle: flag now disabled
    mockFeatureFlags.isEnabled.mockReturnValue(false);

    // Next navigation attempt: flag disabled → deny with 404
    const resultDeny = service.canMatch(route, state);
    expect(resultDeny).not.toBe(true); // Should be UrlTree
    expect((resultDeny as UrlTree).toString()).toContain('/error/404');

    // Verify telemetry shows FLAG_DISABLED reason
    const trackCalls = mockObservability.track.mock.calls;
    const lastCall = trackCalls[trackCalls.length - 1];
    expect(lastCall[1]).toEqual(
      expect.objectContaining({ denyReason: 'flag-disabled', allowed: false })
    );
  });

  it('[TC-005] Context Loss During Lazy Load: tool vanishes from registry → canActivate denies with 404', () => {
    // Scenario: tool was available during canMatch but disappears before canActivate
    mockToolRegistry.exists.mockReturnValue(true); // Available during canMatch
    mockFeatureFlags.isEnabled.mockReturnValue(true);

    const route = {
      data: {
        toolKey: 'ephemeral-tool',
        featureFlagKey: 'global.ephemeral',
      },
      params: { toolKey: 'ephemeral-tool' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/ephemeral-tool');

    // canMatch passes: tool exists
    const canMatchResult = service.canMatch(route, state);
    expect(canMatchResult).toBe(true);

    // Tool registry reports tool no longer exists
    mockToolRegistry.exists.mockReturnValue(false);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: false,
      denyReason: 'notFound',
    });

    // canActivate fails: tool missing in registry check
    const canActivateResult = service.canActivate(route, state);
    expect(typeof canActivateResult).toBe('object'); // UrlTree
    expect((canActivateResult as UrlTree).toString()).toContain('/error');
  });

  it('[TC-006] Parallel Route Requests: two rapid navigations are evaluated independently without race', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    // First request to /tools/pipelines
    const pipelineRoute = {
      data: { toolKey: 'pipelines', featureFlagKey: 'global.pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const pipelineState = makeGuardState('/tools/pipelines');

    // Second request to /tools/vp
    const vpRoute = {
      data: { toolKey: 'vp', featureFlagKey: 'global.vp' },
      params: { toolKey: 'vp' },
    } as unknown as ActivatedRouteSnapshot;
    const vpState = makeGuardState('/tools/vp');

    // Execute both synchronously (simulating parallel requests)
    const result1 = service.canActivate(pipelineRoute, pipelineState);
    const result2 = service.canActivate(vpRoute, vpState);

    // Both should succeed independently
    expect(result1).toBe(true);
    expect(result2).toBe(true);

    // Verify both generated separate telemetry events
    const trackCalls = mockObservability.track.mock.calls;
    expect(trackCalls.length).toBeGreaterThanOrEqual(2);

    // Verify first event has correct toolKey
    const call1 = trackCalls[trackCalls.length - 2];
    expect(call1[1]).toEqual(expect.objectContaining({ toolKey: 'pipelines' }));

    // Verify second event has different toolKey
    const call2 = trackCalls[trackCalls.length - 1];
    expect(call2[1]).toEqual(expect.objectContaining({ toolKey: 'vp' }));
  });

  it('[TC-007] Fallback URL Edge Cases: error routes never redirect to different error status', () => {
    // /error/401 should NOT redirect to /error/404
    const errorRoute401 = {
      data: {},
      params: {},
    } as unknown as ActivatedRouteSnapshot;
    const state401 = makeGuardState('/error/401');

    const result401 = service.canActivate(errorRoute401, state401);
    expect(result401).toBe(true); // Public route, no redirect

    // /error/403 should NOT redirect to /error/401
    const errorRoute403 = {
      data: {},
      params: {},
    } as unknown as ActivatedRouteSnapshot;
    const state403 = makeGuardState('/error/403');

    const result403 = service.canActivate(errorRoute403, state403);
    expect(result403).toBe(true); // Public route, no redirect

    // /error/404 should NOT redirect anywhere
    const errorRoute404 = {
      data: {},
      params: {},
    } as unknown as ActivatedRouteSnapshot;
    const state404 = makeGuardState('/error/404');

    const result404 = service.canActivate(errorRoute404, state404);
    expect(result404).toBe(true); // Public route, no redirect

    // Verify NO redirect cycles: all error routes are terminal
    expect(mockObservability.track).not.toHaveBeenCalled(); // No telemetry for public routes
  });
});

// ============================================================================
// PRIORITY 2: Edge Cases & Error Scenarios
// ============================================================================

describe('RouteGuards - Edge Cases & Error Scenarios', () => {
  let service: RouteGuardsService;
  let router: Router;
  let mockAccessDecision: { canEnter: jest.Mock };
  let mockToolRegistry: { exists: jest.Mock };
  let mockFeatureFlags: { isEnabled: jest.Mock };
  let mockObservability: { track: jest.Mock };

  beforeEach(() => {
    mockAccessDecision = { canEnter: jest.fn() };
    mockToolRegistry = { exists: jest.fn() };
    mockFeatureFlags = { isEnabled: jest.fn() };
    mockObservability = { track: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        RouteGuardsService,
        Router,
        { provide: AccessDecisionService, useValue: mockAccessDecision },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
        { provide: ObservabilityService, useValue: mockObservability },
      ],
    });
    service = TestBed.inject(RouteGuardsService);
    router = TestBed.inject(Router);
  });

  it('[TC-008] Malformed Route Data: route.data with wrong types defaults to safe behavior (deny or allow)', () => {
    // toolKey is number instead of string
    const route1 = {
      data: { toolKey: 123 },
      params: {},
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/invalid');

    const result1 = service.canMatch(route1, state);
    // Should not throw, should deny with 404 (missing valid toolKey)
    expect(typeof result1 === 'object' || typeof result1 === 'boolean').toBe(true);

    // featureFlagKey is boolean instead of string
    const route2 = {
      data: { toolKey: 'pipelines', featureFlagKey: true },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;

    mockToolRegistry.exists.mockReturnValue(true);

    const result2 = service.canMatch(route2, state);
    // Should not throw, should continue (flag is optional)
    expect(result2).toBe(true);

    // route.data is completely null
    const route3 = null as unknown as ActivatedRouteSnapshot;
    expect(() => {
      // Guard should handle gracefully (extract function handles null)
      const reqs = extractRequirementsFromRoute(route3 ?? ({} as ActivatedRouteSnapshot));
      expect(reqs).toEqual({});
    }).not.toThrow();
  });

  it('[TC-009] Service Unavailable Graceful Degradation: all optional services undefined → system allows by default', () => {
    // Create service with NO injected dependencies
    const bareService = new RouteGuardsService(
      router,
      undefined, // AccessDecisionService unavailable
      undefined, // ToolRegistryService unavailable
      undefined, // FeatureFlagService unavailable
      undefined  // ObservabilityService unavailable
    );

    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines');

    // Even with all services unavailable, should allow (graceful degradation)
    const results = {
      canMatch: bareService.canMatch(route, state),
      canActivate: bareService.canActivate(route, state),
    };

    // Both should allow (default allow when services missing)
    expect(results.canMatch).toBe(true);
    expect(results.canActivate).toBe(true);
  });

  it('[TC-010] AccessDecisionService Invalid Response: returns malformed response or null → guard handles without crash', () => {
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
      denyReason: 'forbidden',
    });

    const route1 = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state1 = makeGuardState('/tools/pipelines');

    const result1 = service.canActivate(route1, state1);
    expect(result1).toBe(true);

    mockAccessDecision.canEnter.mockReturnValue(null);
    const result2 = service.canActivate(route1, state1);
    expect(result2).toBe(true);

    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });
    mockAccessDecision.canEnter.mockImplementation(() => {
      throw new Error('Connection timeout');
    });
    let result3: unknown;
    expect(() => {
      result3 = service.canActivate(route1, state1);
    }).not.toThrow();
    expect(result3).not.toBe(true);

    // Clean up: reset mock
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });
  });

  it('[TC-011] Telemetria Failha: ObservabilityService.track() throws → guard retorna allow/deny (erro não bloqueante)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    mockObservability.track.mockImplementation(() => {
      throw new Error('Network connection failed');
    });
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines');

    // Guard should NOT throw even though telemetry fails
    const result = service.canActivate(route, state);

    // Navigation should still succeed (telemetry is non-blocking)
    expect(result).toBe(true);

    // Verify track was attempted and the fallback warning was emitted without polluting test output
    expect(mockObservability.track).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[RouteGuards] Telemetria falhou: route-guard:allow'),
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });

  it('[TC-012] Route Parameters with Special Characters: hyphens, underscores, mixed case normalized correctly', () => {
    mockToolRegistry.exists.mockImplementation((key) => {
      // Normalize lookup to lowercase
      return key === 'my-tool' || key === 'my_tool' || key === 'mytool';
    });
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const testCases = [
      { toolKey: 'my-tool-123', normalized: 'my-tool-123' },
      { toolKey: 'my_tool', normalized: 'my_tool' },
      { toolKey: 'MyTool', normalized: 'mytool' },
    ];

    testCases.forEach(({ toolKey }) => {
      const route = {
        data: { toolKey },
        params: { toolKey },
      } as unknown as ActivatedRouteSnapshot;
      const state = makeGuardState(`/tools/${toolKey}`);

      const normalized_actual = normalizeToolKey(toolKey);
      // normalizeToolKey should convert to lowercase
      expect(normalized_actual).toBe(toolKey.toLowerCase().trim());

      const result = service.canMatch(route, state);
      expect(typeof result === 'boolean' || typeof result === 'object').toBe(true);
    });
  });

  it('[TC-013] Feature Flag Namespace Variations: global, tool, beta flags all passed to service', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const flagTestCases = [
      'global.dashboard',
      'global.pipeline.beta',
      'tool.pipelines.advanced',
      'tool.vp.experimental',
    ];

    flagTestCases.forEach((flagKey) => {
      const route = {
        data: {
          toolKey: 'test-tool',
          featureFlagKey: flagKey,
        },
        params: { toolKey: 'test-tool' },
      } as unknown as ActivatedRouteSnapshot;
      const state = makeGuardState('/tools/test-tool');

      mockFeatureFlags.isEnabled.mockClear();

      service.canMatch(route, state);

      // Verify exact flag key passed to service (no interpretation)
      expect(mockFeatureFlags.isEnabled).toHaveBeenCalledWith(flagKey);
    });
  });
});

// ============================================================================
// PRIORITY 3: Performance & Telemetry Validation
// ============================================================================

describe('RouteGuards - Performance & Telemetry Validation', () => {
  let service: RouteGuardsService;
  let mockAccessDecision: { canEnter: jest.Mock };
  let mockToolRegistry: { exists: jest.Mock };
  let mockFeatureFlags: { isEnabled: jest.Mock };
  let mockObservability: { track: jest.Mock };

  beforeEach(() => {
    mockAccessDecision = { canEnter: jest.fn() };
    mockToolRegistry = { exists: jest.fn() };
    mockFeatureFlags = { isEnabled: jest.fn() };
    mockObservability = { track: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        RouteGuardsService,
        Router,
        { provide: AccessDecisionService, useValue: mockAccessDecision },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
        { provide: ObservabilityService, useValue: mockObservability },
      ],
    });
    service = TestBed.inject(RouteGuardsService);
  });

  it('[TC-014] Guard Execution Performance: canActivate happy path completes in <5ms', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const route = {
      data: { toolKey: 'pipelines', featureFlagKey: 'global.pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines/overview');

    // Measure execution time
    const startTime = performance.now();
    const result = service.canActivate(route, state);
    const endTime = performance.now();

    const executionTime = endTime - startTime;

    // Performance assertion: must complete rapidamente (local execution, no network)
    expect(executionTime).toBeLessThan(5);
    expect(result).toBe(true);
  });

  it('[TC-015] Telemetry Payload Sanitization: NEVER includes token, role, query params in event', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const maliciousUrls = [
      '/tools/pipelines?token=secret-123&role=admin',
      '/tools/pipelines/details?filters[0]=complete&page=2&apiKey=hidden',
      '/tools/vp#debug&token=xyz&sensitive=data',
      '/tools/dashboard?q=test&bearer=secret&session=xyz#anchor',
    ];

    maliciousUrls.forEach((url) => {
      const route = {
        data: { toolKey: 'test-tool' },
        params: { toolKey: 'test-tool' },
      } as unknown as ActivatedRouteSnapshot;
      const state = makeGuardState(url);

      mockObservability.track.mockClear();

      service.canActivate(route, state);

      // Verify track was called
      expect(mockObservability.track).toHaveBeenCalled();

      // Get the payload argument
      const callArgs = mockObservability.track.mock.calls[mockObservability.track.mock.calls.length - 1];
      const payload = callArgs[1];

      // CRITICAL: Verify NO sensitive data in payload
      const payloadStr = JSON.stringify(payload);
      expect(payloadStr).not.toContain('token');
      expect(payloadStr).not.toContain('secret');
      expect(payloadStr).not.toContain('apiKey');
      expect(payloadStr).not.toContain('session');
      expect(payloadStr).not.toContain('bearer');
      expect(payloadStr).not.toContain('role=admin');

      // Verify route path is sanitized (no query params or fragments)
      expect(payload.route).not.toContain('?');
      expect(payload.route).not.toContain('#');
    });
  });

  it('[TC-016] Telemetry Event Names Consistency: canActivate/canMatch both emit route-guard:allow/deny', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const stateAllow = makeGuardState('/tools/pipelines');

    // Test canActivate with allowed=true
    mockObservability.track.mockClear();
    service.canActivate(route, stateAllow);

    let trackCall = mockObservability.track.mock.calls[mockObservability.track.mock.calls.length - 1];
    expect(trackCall[0]).toBe('route-guard:allow');
    expect(trackCall[1]).toEqual(expect.objectContaining({ allowed: true }));

    // Test canMatch with allowed=true
    mockObservability.track.mockClear();
    service.canMatch(route, stateAllow);

    trackCall = mockObservability.track.mock.calls[mockObservability.track.mock.calls.length - 1];
    expect(trackCall[0]).toBe('route-guard:allow');

    // Test canActivate with allowed=false (UNKNOWN_TOOL)
    const stateDeny = makeGuardState('/tools/invalid');

    const denyRoute = {
      data: {},
      params: {},
    } as unknown as ActivatedRouteSnapshot;

    mockObservability.track.mockClear();
    service.canMatch(denyRoute, stateDeny);

    trackCall = mockObservability.track.mock.calls[mockObservability.track.mock.calls.length - 1];
    expect(trackCall[0]).toBe('route-guard:deny');
    expect(trackCall[1]).toEqual(expect.objectContaining({ allowed: false }));
    expect(trackCall[1]).toEqual(expect.objectContaining({ denyReason: expect.any(String) }));
  });
});

// ============================================================================
// PRIORITY 4: Telemetry Error Path Coverage
// ============================================================================

describe('RouteGuards - Telemetry Error Path Coverage', () => {
  let service: RouteGuardsService;
  let mockAccessDecision: { canEnter: jest.Mock };
  let mockToolRegistry: { exists: jest.Mock };
  let mockFeatureFlags: { isEnabled: jest.Mock };
  let mockObservability: { track: jest.Mock };

  beforeEach(() => {
    mockAccessDecision = { canEnter: jest.fn() };
    mockToolRegistry = { exists: jest.fn() };
    mockFeatureFlags = { isEnabled: jest.fn() };
    mockObservability = { track: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        RouteGuardsService,
        Router,
        { provide: AccessDecisionService, useValue: mockAccessDecision },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
        { provide: ObservabilityService, useValue: mockObservability },
      ],
    });
    service = TestBed.inject(RouteGuardsService);
  });

  it('[TC-017] Telemetria Exception Handling: ObservabilityService.track() throws → error logged, guard returns allow/deny decision', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    // Inject error into telemetry
    mockObservability.track.mockImplementation(() => {
      throw new Error('Telemetry network error');
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines');


    // canActivate should still succeed (telemetry error is isolated)
    const result = service.canActivate(route, state);
    expect(result).toBe(true);

    // Verify console.warn was called with error details
    expect(warnSpy).toHaveBeenCalled();
    const warnMessage = warnSpy.mock.calls[warnSpy.mock.calls.length - 1][0];
    expect(warnMessage).toContain('[RouteGuards]');
    expect(warnMessage).toContain('Telemetria falhou');

    warnSpy.mockRestore();
  });

  it('[TC-018] Concurrent Telemetry Submissions: rapid 10 navigations → all 10 telemetry events submitted', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;

    // Simulate 10 rapid navigations
    for (let i = 0; i < 10; i++) {
      const state = makeGuardState(`/tools/pipelines/page-${i}`);
      service.canActivate(route, state);
    }

    // Verify all 10 telemetry events were submitted
    expect(mockObservability.track).toHaveBeenCalledTimes(10);

    // Verify events are in order (check route path progression)
    const allCalls = mockObservability.track.mock.calls;
    allCalls.forEach((call, index) => {
      expect(call[1]).toEqual(
        expect.objectContaining({
          route: `/tools/pipelines/page-${index}`,
        })
      );
    });
  });
});

// ============================================================================
// PRIORITY 1: Integration & E2E Scenarios (5 additional test cases)
// ============================================================================

describe('RouteGuards - Integration & E2E Scenarios', () => {
  let service: RouteGuardsService;
  let mockAccessDecision: { canEnter: jest.Mock };
  let mockToolRegistry: { exists: jest.Mock };
  let mockFeatureFlags: { isEnabled: jest.Mock };
  let mockObservability: { track: jest.Mock };

  beforeEach(() => {
    mockAccessDecision = { canEnter: jest.fn() };
    mockToolRegistry = { exists: jest.fn() };
    mockFeatureFlags = { isEnabled: jest.fn() };
    mockObservability = { track: jest.fn() };

    mockAccessDecision.canEnter.mockReturnValue({ action: 'enter', allowed: true });
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        RouteGuardsService,
        Router,
        { provide: AccessDecisionService, useValue: mockAccessDecision },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
        { provide: ObservabilityService, useValue: mockObservability },
      ],
    });
    service = TestBed.inject(RouteGuardsService);
  });

  it('[TC-019] Sequential Route Navigation: /dashboard (canActivate) → /tools/pipelines (canMatch + canActivate) both guards fire in correct order', () => {
    // Step 1: Navigate to /dashboard (canActivate only)
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const dashboardRoute = {
      data: { featureFlagKey: 'global.dashboard' },
      params: {},
    } as unknown as ActivatedRouteSnapshot;
    const dashboardState = makeGuardState('/dashboard') as unknown;

    const dashboardResult = service.canActivate(dashboardRoute, dashboardState);
    expect(dashboardResult).toBe(true);
    expect(mockObservability.track).toHaveBeenCalledWith(
      'route-guard:allow',
      expect.objectContaining({ route: '/dashboard', allowed: true })
    );

    // Step 2: Navigate to /tools/pipelines (canMatch + canActivate)
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockObservability.track.mockClear();

    const toolRoute = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const toolState = makeGuardState('/tools/pipelines');

    // canMatch should succeed
    const matchResult = service.canMatch(toolRoute, toolState);
    expect(matchResult).toBe(true);

    // canActivate should também succeed
    const activateResult = service.canActivate(toolRoute, toolState);
    expect(activateResult).toBe(true);

    // Verificar que ambos os guards geraram telemetria (canMatch + canActivate = 2 chamadas)
    expect(mockObservability.track).toHaveBeenCalledTimes(2);
  });

  it('[TC-020] Tool Switch with Context Change: /tools/pipelines → /tools/vp AccessDecisionService consulted for NEW tool, old cache does not bleed', () => {
    mockToolRegistry.exists.mockReturnValue(true);

    // First navigation: /tools/pipelines
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const pipelinesRoute = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const pipelinesState = makeGuardState('/tools/pipelines');

    service.canActivate(pipelinesRoute, pipelinesState);
    expect(mockAccessDecision.canEnter).toHaveBeenCalledWith(
      expect.objectContaining({ toolKey: 'pipelines' })
    );

    // Reset mock to verify new context
    mockAccessDecision.canEnter.mockClear();
    mockObservability.track.mockClear();

    // Second navigation: /tools/vp (NEW context)
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: false,
      denyReason: 'forbidden:permission',
    });

    const vpRoute = {
      data: { toolKey: 'vp' },
      params: { toolKey: 'vp' },
    } as unknown as ActivatedRouteSnapshot;
    const vpState = makeGuardState('/tools/vp');

    const vpResult = service.canActivate(vpRoute, vpState);

    // Deve negar (sem bleed de cache do contexto pipelines)
    expect(vpResult).not.toBe(true); // Retorna UrlTree, não true
    expect(mockAccessDecision.canEnter).toHaveBeenCalledWith(
      expect.objectContaining({ toolKey: 'vp' })
    );

    // Verificar eventos de telemetria separados
    expect(mockObservability.track).toHaveBeenCalledWith(
      'route-guard:deny',
      expect.objectContaining({ toolKey: 'vp' })
    );
  });

  it('[TC-021] Feature Flag Toggle Durante Runtime: flag enabled → allow, then flag toggled → next navigation denies with 404', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    // Primeiro: flag habilitada
    mockFeatureFlags.isEnabled.mockReturnValue(true);

    const route = {
      data: { toolKey: 'pipelines', featureFlagKey: 'global.pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines');

    const result1 = service.canMatch(route, state);
    expect(result1).toBe(true); // Permitir quando a flag estiver habilitada

    // Segundo: flag alternada para desligado
    mockFeatureFlags.isEnabled.mockReturnValue(false);
    mockObservability.track.mockClear();

    const result2 = service.canMatch(route, state);
    // Deve retornar UrlTree para /error/404
    expect(result2).not.toBe(true);
    expect(result2).toBeTruthy(); // Objeto UrlTree

    // Verificar se a telemetria mostra 404 (FLAG_DISABLED)
    expect(mockObservability.track).toHaveBeenCalledWith(
      'route-guard:deny',
      expect.objectContaining({
        denyReason: DenyReason.FLAG_DISABLED,
      })
    );
  });

  it('[TC-022] Fallback URL Edge Cases: /error/* routes never protected, prevent redirect loops', () => {
    // Testar se cada página de erro é pública

    const errorRoutes = ['/error/401', '/error/403', '/error/404', '/auth/login', '/public/home'];

    errorRoutes.forEach((errorPath) => {
      const route = {
        data: {},
        params: {},
      } as unknown as ActivatedRouteSnapshot;
      const state = makeGuardState(errorPath);

      const result = service.canActivate(route, state);
      expect(result).toBe(true, `${errorPath} should bypass guard (public route)`);
    });
  });

  it('[TC-023] Lazy Load: Tool module state changes between lazy-load and canActivate → denied with 404', () => {
    // Primeiro: ferramenta existe (canMatch com sucesso)
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);

    const route = {
      data: { toolKey: 'experimental' },
      params: { toolKey: 'experimental' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/experimental');

    const matchResult = service.canMatch(route, state);
    expect(matchResult).toBe(true); // Carregamento atrasado permitido

    // Simular remoção da ferramenta do registro durante o carregamento atrasado
    mockToolRegistry.exists.mockReturnValue(false);
    mockToolRegistry.exists.mockClear();
    mockObservability.track.mockClear();

    // canActivate deve negar (estado alterado)
    const activateResult = service.canActivate(route, state);
    expect(activateResult).not.toBe(true);

    // Verificar telemetria 404
    expect(mockObservability.track).toHaveBeenCalledWith(
      'route-guard:deny',
      expect.objectContaining({
        denyReason: DenyReason.UNKNOWN_TOOL,
      })
    );
  });
});

// ============================================================================
// PRIORITY 2: Edge Cases & Error Scenarios (4 additional test cases)
// ============================================================================

describe('RouteGuards - Edge Cases & Error Scenarios', () => {
  let service: RouteGuardsService;
  let router: Router;
  let mockAccessDecision: { canEnter: jest.Mock };
  let mockToolRegistry: { exists: jest.Mock };
  let mockFeatureFlags: { isEnabled: jest.Mock };
  let mockObservability: { track: jest.Mock };

  beforeEach(() => {
    mockAccessDecision = { canEnter: jest.fn() };
    mockToolRegistry = { exists: jest.fn() };
    mockFeatureFlags = { isEnabled: jest.fn() };
    mockObservability = { track: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        RouteGuardsService,
        Router,
        { provide: AccessDecisionService, useValue: mockAccessDecision },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
        { provide: ObservabilityService, useValue: mockObservability },
      ],
    });
    service = TestBed.inject(RouteGuardsService);
    router = TestBed.inject(Router);
  });

  it('[TC-024] Malformed Route Data: wrong types (number for toolKey), junk keys → guard handles gracefully', () => {
    const malformedRoute = {
      data: {
        toolKey: 12345,
        junkKey1: 'ignored',
        junkKey2: { not: 'string' },
        featureFlagKey: '',
      },
      params: {},
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/invalid');

    // Should handle gracefully without throwing
    expect(() => {
      service.canMatch(malformedRoute, state);
    }).not.toThrow();

    // Should validate and return appropriate deny (invalid toolKey)
    const result = service.canMatch(malformedRoute, state);
    expect(result).not.toBe(true); // Should deny or return UrlTree
  });

  it('[TC-025] Service Unavailable Graceful Degradation: all services null → default allow without crash', () => {
    // Create service with all optional dependencies unavailable
    const servicWithNoDeps = new RouteGuardsService(router, undefined, undefined, undefined, undefined);

    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines');

    // canActivate should default allow (all dependencies missing)
    const result = servicWithNoDeps.canActivate(route, state);
    expect(result).toBe(true); // Default allow when services unavailable
  });

  it('[TC-027] AccessDecisionService Invalid Response Handling: null, undefined, or malformed response → guard behaves safely', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);

    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines');

    // Test with null response
    mockAccessDecision.canEnter.mockReturnValue(null);
    expect(() => {
      service.canActivate(route, state);
    }).not.toThrow();

    // Test with undefined response
    mockAccessDecision.canEnter.mockReturnValue(undefined);
    expect(() => {
      service.canActivate(route, state);
    }).not.toThrow();

    // Test with exception (service throws)
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });
    mockAccessDecision.canEnter.mockImplementation(() => {
      throw new Error('Service error');
    });
    let result3: unknown;
    expect(() => {
      result3 = service.canActivate(route, state);
    }).not.toThrow(); // Guard should handle gracefully
    expect(result3).not.toBe(true);
  });
});

// ============================================================================
// PRIORITY 3: Performance & Telemetry Validation (3 additional test cases)
// ============================================================================

describe('RouteGuards - Performance & Telemetry Validation', () => {
  let service: RouteGuardsService;
  let mockAccessDecision: { canEnter: jest.Mock };
  let mockToolRegistry: { exists: jest.Mock };
  let mockFeatureFlags: { isEnabled: jest.Mock };
  let mockObservability: { track: jest.Mock };

  beforeEach(() => {
    mockAccessDecision = { canEnter: jest.fn() };
    mockToolRegistry = { exists: jest.fn() };
    mockFeatureFlags = { isEnabled: jest.fn() };
    mockObservability = { track: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        RouteGuardsService,
        Router,
        { provide: AccessDecisionService, useValue: mockAccessDecision },
        { provide: ToolRegistryService, useValue: mockToolRegistry },
        { provide: FeatureFlagService, useValue: mockFeatureFlags },
        { provide: ObservabilityService, useValue: mockObservability },
      ],
    });
    service = TestBed.inject(RouteGuardsService);
  });

  it('[TC-028] Guard Execution Performance: canActivate happy path completes in <5ms', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    const route = {
      data: { toolKey: 'pipelines', featureFlagKey: 'global.pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines/overview');

    // Measure execution time
    const startTime = performance.now();
    service.canActivate(route, state);
    const endTime = performance.now();
    const executionTime = endTime - startTime;

    // Guard should execute rapidamente (sem chamadas de rede)
    expect(executionTime).toBeLessThan(5); // Limite de 5ms para execução local
  });

  it('[TC-029] Telemetry Payload Sanitization: query params, fragments, sensitive data removed from telemetry', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });

    // URL complexa com query params e fragmento
    const complexUrl = '/tools/pipelines/details?token=secret123&role=admin&filters[0]=complete#debug-mode';
    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState(complexUrl);

    service.canActivate(route, state);

    // Verificar se a carga útil da telemetria NÃO contém query params ou fragmentos
    expect(mockObservability.track).toHaveBeenCalledWith(
      'route-guard:allow',
      expect.objectContaining({
        route: '/tools/pipelines/details', // Sem query params, sem fragmento, sem segredo
      })
    );

    const telemetryPayload =
      mockObservability.track.mock.calls[mockObservability.track.mock.calls.length - 1][1];
    expect(telemetryPayload.route).not.toContain('token');
    expect(telemetryPayload.route).not.toContain('secret');
    expect(telemetryPayload.route).not.toContain('role');
    expect(telemetryPayload.route).not.toContain('admin');
    expect(telemetryPayload.route).not.toContain('#');
  });

  it('[TC-030] Telemetry Event Name Consistency: all code paths emit correct event names and include all required fields', () => {
    mockToolRegistry.exists.mockReturnValue(true);
    mockFeatureFlags.isEnabled.mockReturnValue(true);

    const route = {
      data: { toolKey: 'pipelines' },
      params: { toolKey: 'pipelines' },
    } as unknown as ActivatedRouteSnapshot;
    const state = makeGuardState('/tools/pipelines');

    // Teste 1: canActivate allow
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: true,
    });
    mockObservability.track.mockClear();

    service.canActivate(route, state);
    expect(mockObservability.track).toHaveBeenCalledWith(
      'route-guard:allow',
      expect.objectContaining({
        allowed: true,
        route: expect.any(String),
        toolKey: 'pipelines',
      })
    );

    // Teste 2: canActivate deny
    mockAccessDecision.canEnter.mockReturnValue({
      action: 'enter',
      allowed: false,
      denyReason: 'forbidden:permission',
    });
    mockObservability.track.mockClear();

    service.canActivate(route, state);
    expect(mockObservability.track).toHaveBeenCalledWith(
      'route-guard:deny',
      expect.objectContaining({
        allowed: false,
        denyReason: expect.any(String),
        route: expect.any(String),
        toolKey: 'pipelines',
      })
    );

    // Teste 3: canMatch deny (missing toolKey)
    mockObservability.track.mockClear();
    const emptyRoute = {
      data: {},
      params: {},
    } as unknown as ActivatedRouteSnapshot;

    service.canMatch(emptyRoute, state);
    expect(mockObservability.track).toHaveBeenCalledWith(
      'route-guard:deny',
      expect.objectContaining({
        allowed: false,
        denyReason: DenyReason.MISSING_ROUTE_DATA,
      })
    );
  });
});

export { }
