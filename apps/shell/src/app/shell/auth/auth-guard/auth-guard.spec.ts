import { AuthGuard } from './auth-guard';
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { SessionService } from '@hub/access-layer';
import { ObservabilityService } from '@hub/observability/data-access';

class MockSessionService {
  isAuthenticated = jest.fn();
  restoreOrRefresh = jest.fn();
}
class MockRouter {
  parseUrl = jest.fn();
}

const makeRoute = (): ActivatedRouteSnapshot => ({} as ActivatedRouteSnapshot);
const makeState = (url: string): RouterStateSnapshot => ({ url } as RouterStateSnapshot);

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let sessionService: MockSessionService;
  let router: MockRouter;
  let observability: ObservabilityService;
  let trackEventSpy: jest.SpyInstance;

  beforeEach(() => {
    sessionService = new MockSessionService();
    router = new MockRouter();
    observability = new ObservabilityService({ enabled: false });
    trackEventSpy = jest.spyOn(observability, 'trackEvent').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: SessionService, useValue: sessionService },
        { provide: Router, useValue: router },
        { provide: ObservabilityService, useValue: observability },
      ],
    });
    guard = TestBed.inject(AuthGuard);
  });

  afterEach(() => {
    trackEventSpy.mockRestore();
  });

  it('should allow navigation when authenticated', () => {
    sessionService.isAuthenticated.mockReturnValue(true);
    const result = guard.canActivate(makeRoute(), makeState('/tools'));
    expect(result).toBe(true);
    expect(trackEventSpy).toHaveBeenCalledWith('GUARD_ALLOW', { reason: 'authenticated' });
  });

  it('should redirect to login when not authenticated', async () => {
    sessionService.isAuthenticated.mockReturnValue(false);
    sessionService.restoreOrRefresh.mockReturnValue(Promise.resolve({ authenticated: false }));
    router.parseUrl.mockReturnValue({} as UrlTree);
    await guard.canActivate(makeRoute(), makeState('/tools'));
    expect(router.parseUrl).toHaveBeenCalled();
    expect(trackEventSpy).toHaveBeenCalledWith('GUARD_DENY', { reason: 'not_authenticated' });
  });

  it('should redirect to /auth/login without returnUrl when denied from auth route', async () => {
    sessionService.isAuthenticated.mockReturnValue(false);
    sessionService.restoreOrRefresh.mockReturnValue(Promise.resolve({ authenticated: false }));
    router.parseUrl.mockReturnValue({} as UrlTree);
    await guard.canActivate(makeRoute(), makeState('/auth/callback'));
    expect(router.parseUrl).toHaveBeenCalledWith('/auth/login');
  });

  it('should allow when session restored', async () => {
    sessionService.isAuthenticated.mockReturnValueOnce(false).mockReturnValueOnce(true);
    sessionService.restoreOrRefresh.mockReturnValue(Promise.resolve({ authenticated: true }));
    const result = await guard.canActivate(makeRoute(), makeState('/tools'));
    expect(result).toBe(true);
    expect(trackEventSpy).toHaveBeenCalledWith('GUARD_ALLOW', { reason: 'session_restored' });
  });
});
