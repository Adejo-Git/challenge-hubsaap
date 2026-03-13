import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { HttpBaseModule, OBSERVABILITY_SERVICE, CONTEXT_SNAPSHOT, ObservabilityHttpAdapter } from './http-base.module';
import { ErrorCode } from '@hub/error-model';

type ObservabilitySpy = Required<ObservabilityHttpAdapter> & {
  recordStart: jest.Mock<void, [Record<string, unknown>]>;
  recordEnd: jest.Mock<void, [Record<string, unknown>]>;
};

type NormalizedHttpError = Error & {
  standardError?: {
    status?: number;
    code?: string;
  };
};

const createObservabilitySpy = (): ObservabilitySpy => ({
  recordStart: jest.fn<void, [Record<string, unknown>]>(),
  recordEnd: jest.fn<void, [Record<string, unknown>]>(),
});

describe('HttpBase interceptors', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;

  let observabilitySpy: ObservabilitySpy;

  beforeEach(() => {
    observabilitySpy = createObservabilitySpy();

    TestBed.configureTestingModule({
      // Default module wiring used by most tests: interceptors enabled, no timeout.
      imports: [HttpClientTestingModule, HttpBaseModule.forRoot({ publicRoutes: [], defaultTimeoutMs: 0 })],
      providers: [
        { provide: CONTEXT_SNAPSHOT, useValue: { tenantId: 't-123', projectId: 'p-1' } },
        { provide: OBSERVABILITY_SERVICE, useValue: observabilitySpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => ctrl.verify());

  it('should add X-Correlation-Id header', (done) => {
    http.get('http://localhost/api/test').subscribe(() => {
      expect(observabilitySpy.recordStart).toHaveBeenCalled();
      expect(observabilitySpy.recordEnd).toHaveBeenCalled();

      const lastEndCall = observabilitySpy.recordEnd.mock.calls.at(-1);
      expect(lastEndCall).toBeTruthy();
      const endArgs = lastEndCall[0];

      expect(endArgs.status).toBe(200);
      expect(endArgs.method).toBe('GET');
      expect(endArgs.ok).toBe(true);
      done();
    });

    const req = ctrl.expectOne('http://localhost/api/test');
    expect(req.request.headers.has('X-Correlation-Id')).toBeTruthy();
    req.flush({ ok: true });
  });

  it('should add context headers when snapshot present', (done) => {
    http.get('http://localhost/api/ctx').subscribe(() => {
      done();
    });

    const req = ctrl.expectOne('http://localhost/api/ctx');
    expect(req.request.headers.get('X-Tenant-Id')).toBe('t-123');
    expect(req.request.headers.get('X-Project-Id')).toBe('p-1');
    req.flush({ ok: true });
  });

  it('should normalize HTTP error into standardError', (done) => {
    http.get('http://localhost/api/error').subscribe({
      next: () => { throw new Error('expected error'); },
      error: (err: unknown) => {
        expect(err).toBeTruthy();

        const normalizedError = err as NormalizedHttpError;
        expect(normalizedError.standardError).toBeTruthy();
        expect(normalizedError.standardError?.status).toBe(500);

        expect(observabilitySpy.recordEnd).toHaveBeenCalled();
        const lastEndCall = observabilitySpy.recordEnd.mock.calls.at(-1);
        expect(lastEndCall).toBeTruthy();
        const endArgs = lastEndCall?.[0];

        expect(endArgs?.status).toBe(500);
        expect(endArgs?.failed).toBe(true);
        expect(endArgs?.ok).toBe(false);
        done();
      },
    });

    const req = ctrl.expectOne('http://localhost/api/error');
    req.flush({ code: 'E123', message: 'boom' }, { status: 500, statusText: 'Server Error' });
  });

  it('should normalize timeout into standardError', (done) => {
    // This test needs timeout enabled.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HttpBaseModule.forRoot({ publicRoutes: [], defaultTimeoutMs: 25 })],
      providers: [
        { provide: CONTEXT_SNAPSHOT, useValue: { tenantId: 't-123', projectId: 'p-1' } },
        { provide: OBSERVABILITY_SERVICE, useValue: observabilitySpy },
      ],
    });

    const httpTimeout = TestBed.inject(HttpClient);
    const ctrlTimeout = TestBed.inject(HttpTestingController);

    let captured: NormalizedHttpError | undefined;
    httpTimeout.get('http://localhost/api/slow').subscribe({
      next: () => { throw new Error('expected error'); },
      error: (err: unknown) => {
        captured = err as NormalizedHttpError;
      },
    });

    const req = ctrlTimeout.expectOne('http://localhost/api/slow');

    setTimeout(() => {
      expect(captured).toBeTruthy();
      expect(captured?.standardError).toBeTruthy();
      expect(captured?.standardError?.code).toBe(ErrorCode.HTTP_TIMEOUT);
      expect(req.cancelled).toBe(true);

      done();
    }, 40);
  });

  it('should NOT add headers for publicRoutes', (done) => {
    // For public routes, we want interceptors to skip.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HttpBaseModule.forRoot({ publicRoutes: ['/public'], defaultTimeoutMs: 0 })],
      providers: [
        { provide: CONTEXT_SNAPSHOT, useValue: { tenantId: 't-123', projectId: 'p-1' } },
        { provide: OBSERVABILITY_SERVICE, useValue: observabilitySpy },
      ],
    });

    const httpPublic = TestBed.inject(HttpClient);
    const ctrlPublic = TestBed.inject(HttpTestingController);

    httpPublic.get('http://localhost/public/info').subscribe(() => {
      done();
    });

    const req = ctrlPublic.expectOne('http://localhost/public/info');
    expect(req.request.headers.has('X-Correlation-Id')).toBeFalsy();
    expect(req.request.headers.has('X-Tenant-Id')).toBeFalsy();
    req.flush({ ok: true });
  });

  it('should respect allowlist and denylist for cross-origin domains', (done) => {
    const finish = (() => {
      let count = 0;
      return () => {
        count += 1;
        if (count === 2) {
          done();
        }
      };
    })();

    // allowlist case: header should be added
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HttpBaseModule.forRoot({ allowlistDomains: ['api.external'] })],
      providers: [
        { provide: CONTEXT_SNAPSHOT, useValue: { tenantId: 't-123' } },
        { provide: OBSERVABILITY_SERVICE, useValue: observabilitySpy },
      ],
    });
    const http2 = TestBed.inject(HttpClient);
    const ctrl2 = TestBed.inject(HttpTestingController);

    http2.get('https://api.external/resource').subscribe(() => {
      finish();
    });
    const reqAllow = ctrl2.expectOne('https://api.external/resource');
    expect(reqAllow.request.headers.has('X-Correlation-Id')).toBeTruthy();
    reqAllow.flush({ ok: true });

    // denylist case: header should NOT be added
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, HttpBaseModule.forRoot({ denylistDomains: ['nope.external'] })],
      providers: [
        { provide: CONTEXT_SNAPSHOT, useValue: { tenantId: 't-123' } },
        { provide: OBSERVABILITY_SERVICE, useValue: observabilitySpy },
      ],
    });
    const http3 = TestBed.inject(HttpClient);
    const ctrl3 = TestBed.inject(HttpTestingController);

    http3.get('https://nope.external/resource').subscribe(() => {
      finish();
    });
    const reqDeny = ctrl3.expectOne('https://nope.external/resource');
    expect(reqDeny.request.headers.has('X-Correlation-Id')).toBeFalsy();
    reqDeny.flush({ ok: true });
  });
});
