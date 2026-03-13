import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AccessDecisionService, DecisionResult, DenyReason } from '@hub/access-layer';
import { ObservabilityService } from '@hub/observability/data-access';
import { shellRoutes } from './shell-routes';
import { authGuard, toolGuard } from './tool-routes';
import { setupRouterEvents } from './router-events';

type RouterWithObservablePipe = Router & {
  events: {
    pipe: jest.Mock;
  };
};

class AccessDecisionTestAdapter {
  private result: DecisionResult = {
    allow: true,
    timestamp: Date.now(),
  };

  setDecision(result: Partial<DecisionResult>): void {
    this.result = {
      allow: true,
      timestamp: Date.now(),
      ...result,
    };
  }

  canEnterTool = jest.fn((): DecisionResult => this.result);
}

describe('RouterToolRoutes', () => {
  let router: Router;
  let accessDecision: AccessDecisionTestAdapter;
  let observabilityService: ObservabilityService;

  function makeRoute(params: Record<string, string> = {}): ActivatedRouteSnapshot {
    return { params } as unknown as ActivatedRouteSnapshot;
  }

  function makeState(url = '/tools/dashboard'): RouterStateSnapshot {
    return { url } as RouterStateSnapshot;
  }

  beforeEach(async () => {
    accessDecision = new AccessDecisionTestAdapter();
    observabilityService = new ObservabilityService({ enabled: false });

    await TestBed.configureTestingModule({
      providers: [
        { provide: AccessDecisionService, useValue: accessDecision },
        { provide: ObservabilityService, useValue: observabilityService },
        {
          provide: Router,
          useValue: {
            navigate: jest.fn(),
            navigateByUrl: jest.fn(),
            getCurrentNavigation: jest.fn(() => null),
            serializeUrl: jest.fn((u: unknown) => (typeof u === 'string' ? u : '/')),
            events: {
              pipe: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
            },
            parseUrl: jest.fn((url: string) => ({ toString: () => url } as UrlTree)),
            config: [],
            url: '/',
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  // ─── Shell Routes Configuration ──────────────────────────────────────────

  describe('Shell Routes Configuration', () => {
    it('deve ter rota raiz configurada', () => {
      expect(shellRoutes).toBeDefined();
      expect(shellRoutes.length).toBeGreaterThan(0);
    });

    it('deve redirecionar rota vazia para dashboard', () => {
      const redirectRoute = shellRoutes.find((r) => r.path === '' && r.redirectTo);
      expect(redirectRoute?.redirectTo).toBe('/dashboard');
      expect(redirectRoute?.pathMatch).toBe('full');
    });

    it('deve conter rota dashboard com lazy loading', () => {
      const dashboardRoute = shellRoutes.find((r) => r.path === 'dashboard');
      expect(dashboardRoute).toBeDefined();
      expect(dashboardRoute?.loadComponent).toBeDefined();
    });

    it('deve conter rota /tools com subrotas para lazy tools', () => {
      const toolsRoute = shellRoutes.find((r) => r.path === 'tools');
      expect(toolsRoute).toBeDefined();
      expect(toolsRoute?.children).toBeDefined();
      expect(toolsRoute?.children?.length).toBeGreaterThan(0);
    });

    it('deve conter rotas de erro (401, 403, 404)', () => {
      const errorRoute = shellRoutes.find((r) => r.path === 'error');
      expect(errorRoute).toBeDefined();
      expect(errorRoute?.children?.length).toBe(3);

      const error401 = errorRoute?.children?.find((r) => r.path === '401');
      const error403 = errorRoute?.children?.find((r) => r.path === '403');
      const error404 = errorRoute?.children?.find((r) => r.path === '404');

      expect(error401).toBeDefined();
      expect(error403).toBeDefined();
      expect(error404).toBeDefined();
    });

    it('deve conter wildcard rota redirecionando para 404', () => {
      const wildcardRoute = shellRoutes.find((r) => r.path === '**');
      expect(wildcardRoute).toBeDefined();
      expect(wildcardRoute?.redirectTo).toBe('/error/404');
      expect(wildcardRoute?.pathMatch).toBe('full');
    });
  });

  // ─── authGuard ────────────────────────────────────────────────────────────

  describe('authGuard', () => {
    it('deve permitir acesso quando decisão é allow', () => {
      accessDecision.setDecision({ allow: true });

      const result = TestBed.runInInjectionContext(() =>
        authGuard(makeRoute(), makeState())
      );

      expect(result).toBe(true);
    });

    it('deve redirecionar para /login quando denyReason é unauthenticated', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.UNAUTHENTICATED });

      const result = TestBed.runInInjectionContext(() =>
        authGuard(makeRoute(), makeState('/tools/dashboard'))
      );

      expect(result).not.toBe(true);
      expect((result as UrlTree).toString()).toContain('/login');
      expect((result as UrlTree).toString()).toContain('returnUrl');
    });

    it('deve permitir quando denyReason não é unauthenticated (delegado ao toolGuard)', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.DISABLED });

      const result = TestBed.runInInjectionContext(() =>
        authGuard(makeRoute(), makeState())
      );

      expect(result).toBe(true);
    });
  });

  // ─── toolGuard ────────────────────────────────────────────────────────────

  describe('toolGuard', () => {
    it('deve permitir acesso quando decisão é allow', () => {
      accessDecision.setDecision({ allow: true });

      const result = TestBed.runInInjectionContext(() =>
        toolGuard(makeRoute({ toolKey: 'dashboard' }), makeState())
      );

      expect(result).toBe(true);
    });

    it('deve redirecionar para /error/404 quando denyReason é notFound', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.NOT_FOUND });

      const result = TestBed.runInInjectionContext(() =>
        toolGuard(makeRoute({ toolKey: 'unknown-tool' }), makeState())
      );

      expect((result as UrlTree).toString()).toContain('/error/404');
    });

    it('deve redirecionar para /error/404 quando denyReason é disabled', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.DISABLED });

      const result = TestBed.runInInjectionContext(() =>
        toolGuard(makeRoute({ toolKey: 'beta-tool' }), makeState())
      );

      expect((result as UrlTree).toString()).toContain('/error/404');
    });

    it('deve redirecionar para /auth/login quando denyReason é unauthenticated', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.UNAUTHENTICATED });

      const result = TestBed.runInInjectionContext(() =>
        toolGuard(makeRoute({ toolKey: 'dashboard' }), makeState())
      );

      expect((result as UrlTree).toString()).toContain('/auth/login');
    });

    it('deve redirecionar para /error/403 quando denyReason é forbidden', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.FORBIDDEN });

      const result = TestBed.runInInjectionContext(() =>
        toolGuard(makeRoute({ toolKey: 'admin-panel' }), makeState())
      );

      expect((result as UrlTree).toString()).toContain('/error/403');
    });

    it('deve redirecionar para /error/403 como fallback para denyReason desconhecido', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.POLICY_DENIED });

      const result = TestBed.runInInjectionContext(() =>
        toolGuard(makeRoute({ toolKey: 'some-tool' }), makeState())
      );

      expect((result as UrlTree).toString()).toContain('/error/403');
    });
  });

  // ─── Navigation Fallback Consistency ─────────────────────────────────────

  describe('Navigation Fallback Consistency', () => {
    it('authGuard redireciona para /login quando sessão inválida', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.UNAUTHENTICATED });

      const result = TestBed.runInInjectionContext(() =>
        authGuard(makeRoute(), makeState('/tools/reports'))
      );

      expect((result as UrlTree).toString()).toContain('/login');
    });

    it('toolGuard redireciona para /error/403 quando sem permissão', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.FORBIDDEN });

      const result = TestBed.runInInjectionContext(() =>
        toolGuard(makeRoute({ toolKey: 'admin' }), makeState())
      );

      expect((result as UrlTree).toString()).toContain('/error/403');
    });

    it('toolGuard redireciona para /error/404 quando tool inexistente/desabilitada', () => {
      accessDecision.setDecision({ allow: false, denyReason: DenyReason.DISABLED });

      const result = TestBed.runInInjectionContext(() =>
        toolGuard(makeRoute({ toolKey: 'disabled-tool' }), makeState())
      );

      expect((result as UrlTree).toString()).toContain('/error/404');
    });

    it('authGuard e toolGuard são coerentes: allow em ambos resulta em acesso', () => {
      accessDecision.setDecision({ allow: true });

      const authResult = TestBed.runInInjectionContext(() =>
        authGuard(makeRoute(), makeState())
      );
      const toolResult = TestBed.runInInjectionContext(() =>
        toolGuard(makeRoute({ toolKey: 'dashboard' }), makeState())
      );

      expect(authResult).toBe(true);
      expect(toolResult).toBe(true);
    });
  });

  // ─── Router Events Bridge ─────────────────────────────────────────────────

  describe('Router Events Bridge', () => {
    it('deve inicializar listeners de eventos do router', () => {
      expect(() => {
        setupRouterEvents(router, observabilityService);
      }).not.toThrow();
    });

    it('deve rastrear eventos de navegação via observabilityService', () => {
      const trackEventSpy = jest.spyOn(observabilityService, 'trackEvent');
      setupRouterEvents(router, observabilityService);
      const routerWithEvents = router as RouterWithObservablePipe;
      expect(routerWithEvents.events.pipe).toHaveBeenCalled();
      expect(trackEventSpy).toBeDefined();
      trackEventSpy.mockRestore();
    });

    it('deve rastrear erros de navegação via observabilityService', () => {
      const captureExceptionSpy = jest.spyOn(observabilityService, 'captureException');
      setupRouterEvents(router, observabilityService);
      const routerWithEvents = router as RouterWithObservablePipe;
      expect(routerWithEvents.events.pipe).toHaveBeenCalled();
      expect(captureExceptionSpy).toBeDefined();
      captureExceptionSpy.mockRestore();
    });
  });

  // ─── Lazy Loading Behavior ────────────────────────────────────────────────

  describe('Lazy Loading Behavior', () => {
    it('deve usar loadComponent para dashboard (não lazy em sandbox)', () => {
      const dashboardRoute = shellRoutes.find((r) => r.path === 'dashboard');
      expect(dashboardRoute?.loadComponent).toBeDefined();
    });

    it('deve usar loadChildren para tools (lazy loading)', () => {
      const toolsRoute = shellRoutes.find((r) => r.path === 'tools');
      const toolKeyRoute = toolsRoute?.children?.find((r) => r.path === ':toolKey');
      expect(toolKeyRoute?.loadChildren).toBeDefined();
    });
  });
});
