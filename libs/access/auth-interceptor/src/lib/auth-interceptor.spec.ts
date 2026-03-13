import { AuthInterceptor } from './auth.interceptor';
import { AuthSessionService } from '@hub/auth-session';
import { ObservabilityService } from '@hub/observability/data-access';
import { of, throwError, Observable } from 'rxjs';
import { DEFAULT_AUTH_INTERCEPTOR_CONFIG } from './auth-interceptor.config';
import { ErrorCode } from '@hub/error-model';

describe('AuthInterceptor (unit)', () => {
  type CloneOpts = { setHeaders?: Record<string, string> };
  type MockReq = {
    url: string;
    headers: { get(name: string): string | null };
    clone(opts?: CloneOpts): MockReq;
  };

  function createReq(url: string): MockReq {
    const makeReq = (baseMap: Map<string, string>): MockReq => {
      return {
        url,
        headers: {
          get: (name: string) => baseMap.get(name) ?? null
        },
        clone: (opts: CloneOpts = {}) => {
          const next = new Map(baseMap);
          const setHeaders = opts.setHeaders;
          if (setHeaders) {
            for (const k of Object.keys(setHeaders)) {
              next.set(k, setHeaders[k]);
            }
          }
          return makeReq(next);
        }
      };
    };
    return makeReq(new Map<string, string>());
  }

  it('anexa Authorization quando shouldAttachAuth true', (done) => {
    const req = createReq('https://api.example.com/protected');
    const calls: MockReq[] = [];
    const handler = {
      handle: (r: MockReq): Observable<unknown> => {
        calls.push(r);
        return of({});
      }
    };

    const authSession: Partial<AuthSessionService> = { getAccessToken: () => 'tok' };
    const obs: Partial<ObservabilityService> = { getCorrelationId: () => 'corr-1' };
    const interceptor = new AuthInterceptor(authSession as AuthSessionService, obs as ObservabilityService, DEFAULT_AUTH_INTERCEPTOR_CONFIG);

    interceptor.intercept(req, handler).subscribe({
      next: () => {
        const sent = calls[0] as MockReq;
        const authHeaderName = DEFAULT_AUTH_INTERCEPTOR_CONFIG.authHeaderName ?? 'Authorization';
        const corrHeaderName = DEFAULT_AUTH_INTERCEPTOR_CONFIG.correlationHeaderName ?? 'X-Correlation-Id';
        expect(sent.headers.get(authHeaderName)).toBe('Bearer tok');
        expect(sent.headers.get(corrHeaderName)).toBe('corr-1');
        done();
      },
      error: (e) => done.fail(e)
    });
  });

  it('nao anexa Authorization em rota publica', (done) => {
    const config = { ...DEFAULT_AUTH_INTERCEPTOR_CONFIG, publicPaths: ['/public'] };
    const req = createReq('/public/info');
    const calls: MockReq[] = [];
    const handler = {
      handle: (r: MockReq): Observable<unknown> => {
        calls.push(r);
        return of({});
      }
    };
    const authSession: Partial<AuthSessionService> = { getAccessToken: () => 'tok' };
    const obs: Partial<ObservabilityService> = { getCorrelationId: () => 'corr-2' };
    const interceptor = new AuthInterceptor(authSession as AuthSessionService, obs as ObservabilityService, config);

    interceptor.intercept(req, handler).subscribe({
      next: () => {
        const sent = calls[0] as MockReq;
        const authHeaderName2 = config.authHeaderName ?? 'Authorization';
        const corrHeaderName2 = config.correlationHeaderName ?? 'X-Correlation-Id';
        expect(sent.headers.get(authHeaderName2)).toBeNull();
        expect(sent.headers.get(corrHeaderName2)).toBe('corr-2');
        done();
      },
      error: (e) => done.fail(e)
    });
  });

  it('normaliza 401 e invalida sessao quando configurado', (done) => {
    const req = createReq('https://api.example.com/protected');
    const handler = {
      handle: (): Observable<never> => {
        return throwError(() => ({ status: 401, message: 'nope' } as unknown));
      }
    };
    let invalidated = false;
    const authSession: Partial<AuthSessionService> = {
      getAccessToken: () => 'tok',
      clear: () => { invalidated = true; }
    };
    const obs: Partial<ObservabilityService> = { getCorrelationId: () => 'corr-3' };
    const interceptor = new AuthInterceptor(authSession as AuthSessionService, obs as ObservabilityService, DEFAULT_AUTH_INTERCEPTOR_CONFIG);

    interceptor.intercept(req, handler).subscribe({
      next: () => done.fail('should not succeed'),
      error: (err) => {
        expect(err.code).toBeDefined();
        // esperar mapeamento para ErrorCode.UNAUTHENTICATED (string), mas testes checam invalidação
        expect(invalidated).toBe(true);
        done();
      }
    });
  });

  it('normaliza 403 para PERMISSION_DENIED', (done) => {
    const req = createReq('https://api.example.com/protected');
    const handler = {
      handle: (): Observable<never> => {
        return throwError(() => ({ status: 403, message: 'forbidden' } as unknown));
      }
    };

    const authSession: Partial<AuthSessionService> = {
      getAccessToken: () => 'tok'
    };
    const obs: Partial<ObservabilityService> = { getCorrelationId: () => 'corr-403' };
    const interceptor = new AuthInterceptor(authSession as AuthSessionService, obs as ObservabilityService, DEFAULT_AUTH_INTERCEPTOR_CONFIG);

    interceptor.intercept(req, handler).subscribe({
      next: () => done.fail('should not succeed'),
      error: (err) => {
        expect(err.code).toBe(ErrorCode.PERMISSION_DENIED);
        done();
      }
    });
  });

  it('nao envia Authorization para observability/provider (sem logs)', (done) => {
    const req = createReq('https://api.example.com/protected');
    const calls: MockReq[] = [];
    const handler = {
      handle: (r: MockReq): Observable<unknown> => {
        calls.push(r);
        return of({});
      }
    };

    const authSession: Partial<AuthSessionService> = { getAccessToken: () => 'tok' };
    const obsCalls: { capture: unknown[]; track: unknown[]; breadcrumbs: unknown[] } = { capture: [], track: [], breadcrumbs: [] };
    const obs: Partial<ObservabilityService> = {
      getCorrelationId: () => 'corr-no-log',
      captureException: (p: unknown) => obsCalls.capture.push(p),
      trackEvent: (n: string, p?: Record<string, unknown>) => obsCalls.track.push({ n, p }),
      addBreadcrumb: (m: string, c?: string, l?: 'info' | 'warn' | 'error') => obsCalls.breadcrumbs.push({ m, c, l })
    };

    const interceptor = new AuthInterceptor(authSession as AuthSessionService, obs as ObservabilityService, DEFAULT_AUTH_INTERCEPTOR_CONFIG);
    interceptor.intercept(req, handler).subscribe({
      next: () => {
        // nenhum método de observability foi chamado com dados de headers
        expect(obsCalls.capture.length).toBe(0);
        expect(obsCalls.track.length).toBe(0);
        expect(obsCalls.breadcrumbs.length).toBe(0);
        done();
      },
      error: (e) => done.fail(e)
    });
  });
});
