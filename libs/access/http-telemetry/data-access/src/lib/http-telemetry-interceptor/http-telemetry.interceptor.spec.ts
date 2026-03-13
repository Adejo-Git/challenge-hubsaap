import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpTelemetryInterceptor } from './http-telemetry.interceptor';
import { ObservabilityService, HttpTelemetryConfig } from './http-telemetry.model';
import { HTTP_TELEMETRY_CONFIG_TOKEN, OBSERVABILITY_SERVICE_TOKEN, HTTP_TELEMETRY_SAMPLER_TOKEN } from './http-telemetry.config';

describe('HttpTelemetryInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  const obsMock: ObservabilityService = {
    getCorrelationId: () => 'corr-123',
    addBreadcrumb: jest.fn(),
    trackEvent: jest.fn(),
    captureException: jest.fn()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
          { provide: OBSERVABILITY_SERVICE_TOKEN, useValue: obsMock },
          { provide: HTTP_INTERCEPTORS, useClass: HttpTelemetryInterceptor, multi: true },
          { provide: HTTP_TELEMETRY_CONFIG_TOKEN, useValue: { enabled: true, samplingRate: 1, headerName: 'x-correlation-id', capture4xx: true, capture5xx: true, urlPolicy: { denylist: ['/assets'], maxLength: 200 } } as HttpTelemetryConfig },
          { provide: HTTP_TELEMETRY_SAMPLER_TOKEN, useValue: () => 0 }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should add correlation header and emit breadcrumbs and event on success', (done) => {
    http.get('/api/test?secret=1').subscribe(() => {
      expect(obsMock.addBreadcrumb).toHaveBeenCalledTimes(2); // start + end
      expect(obsMock.trackEvent).toHaveBeenCalledTimes(1);
      done();
    });

    const req = httpMock.expectOne('/api/test?secret=1');
    expect(req.request.headers.get('x-correlation-id')).toBe('corr-123');
    req.flush({ ok: true }, { status: 200, statusText: 'OK' });
  });

  it('should ignore denylist urls', (done) => {
    http.get('/assets/logo.png').subscribe(() => {
      // should not call trackEvent due to denylist
      expect(obsMock.trackEvent).not.toHaveBeenCalled();
      // should also not call addBreadcrumb for denylisted url
      expect(obsMock.addBreadcrumb).not.toHaveBeenCalled();
      done();
    });

    const req = httpMock.expectOne('/assets/logo.png');
    // but header should still be added
    expect(req.request.headers.get('x-correlation-id')).toBe('corr-123');
    req.flush({ ok: true }, { status: 200, statusText: 'OK' });
  });

  it('should not run when disabled via config', (done) => {
    // recreate module with disabled config
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: OBSERVABILITY_SERVICE_TOKEN, useValue: obsMock },
        { provide: HTTP_INTERCEPTORS, useClass: HttpTelemetryInterceptor, multi: true },
        { provide: HTTP_TELEMETRY_CONFIG_TOKEN, useValue: { enabled: false } as Partial<HttpTelemetryConfig> },
      ]
    });

    const http2 = TestBed.inject(HttpClient);
    const httpMock2 = TestBed.inject(HttpTestingController);

    http2.get('/api/skip').subscribe(() => {
      expect(obsMock.addBreadcrumb).not.toHaveBeenCalled();
      done();
    });

    const req = httpMock2.expectOne('/api/skip');
    req.flush({ ok: true }, { status: 200, statusText: 'OK' });
  });

  it('should capture exception on 500', (done) => {
    http.get('/api/fail').subscribe({
      next: () => fail('should error'),
      error: () => {
        expect(obsMock.captureException).toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('/api/fail');
    req.flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
  });

  it('should calculate and register durationMs in trackEvent', (done) => {
    const dateNowSpy = jest.spyOn(Date, 'now');
    dateNowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1005);

    http.get('/api/duration-test').subscribe(() => {
      // Verify trackEvent was called
      expect(obsMock.trackEvent).toHaveBeenCalledTimes(1);
      
      // Extract the call arguments
      const trackEventCall = (obsMock.trackEvent as jest.Mock).mock.calls[0];
      expect(trackEventCall[0]).toBe('http.response');
      
      const payload = trackEventCall[1];
      expect(payload).toHaveProperty('durationMs');
      expect(typeof payload.durationMs).toBe('number');
      expect(payload.durationMs).toBeGreaterThan(0);
      expect(payload.durationMs).toBe(5);
      expect(payload).toHaveProperty('status', 200);
      expect(payload).toHaveProperty('method', 'GET');
      expect(payload).toHaveProperty('correlationId', 'corr-123');
      
      done();
    });

    const req = httpMock.expectOne('/api/duration-test');
    req.flush({ ok: true }, { status: 200, statusText: 'OK' });
  });

  it('should not capture sensitive headers in telemetry', (done) => {
    const sensitiveHeaders = {
      'Authorization': 'Bearer super-secret-token',
      'Cookie': 'session=abc123',
      'X-Api-Key': 'secret-key-123'
    };

    http.get('/api/secure', { headers: sensitiveHeaders }).subscribe(() => {
      // Verify trackEvent was called
      expect(obsMock.trackEvent).toHaveBeenCalledTimes(1);
      const trackEventPayload = (obsMock.trackEvent as jest.Mock).mock.calls[0][1];
      
      // Ensure no sensitive headers are in the payload
      const payloadString = JSON.stringify(trackEventPayload);
      expect(payloadString).not.toContain('Bearer');
      expect(payloadString).not.toContain('super-secret-token');
      expect(payloadString).not.toContain('session=abc123');
      expect(payloadString).not.toContain('secret-key-123');
      
      // Verify breadcrumbs also don't contain sensitive data
      expect(obsMock.addBreadcrumb).toHaveBeenCalled();
      const breadcrumbCalls = (obsMock.addBreadcrumb as jest.Mock).mock.calls;
      breadcrumbCalls.forEach((call: unknown[]) => {
        const breadcrumbData = JSON.stringify(call);
        expect(breadcrumbData).not.toContain('Bearer');
        expect(breadcrumbData).not.toContain('super-secret-token');
      });
      
      done();
    });

    const req = httpMock.expectOne('/api/secure');
    // Verify correlation header was added (but not sensitive ones captured in telemetry)
    expect(req.request.headers.get('x-correlation-id')).toBe('corr-123');
    expect(req.request.headers.get('Authorization')).toBe('Bearer super-secret-token');
    req.flush({ ok: true }, { status: 200, statusText: 'OK' });
  });

  it('should not include sensitive headers in captureException context', (done) => {
    const sensitiveHeaders = {
      'Authorization': 'Bearer super-secret-token',
      'Cookie': 'session=abc123',
      'X-Api-Key': 'secret-key-123'
    };

    http.get('/api/secure-fail', { headers: sensitiveHeaders }).subscribe({
      next: () => fail('should error'),
      error: () => {
        expect(obsMock.captureException).toHaveBeenCalledTimes(1);
        const captureCall = (obsMock.captureException as jest.Mock).mock.calls[0];
        const context = captureCall[1];
        const contextString = JSON.stringify(context);

        expect(contextString).not.toContain('Bearer');
        expect(contextString).not.toContain('super-secret-token');
        expect(contextString).not.toContain('session=abc123');
        expect(contextString).not.toContain('secret-key-123');
        done();
      }
    });

    const req = httpMock.expectOne('/api/secure-fail');
    expect(req.request.headers.get('Authorization')).toBe('Bearer super-secret-token');
    req.flush({ error: 'boom' }, { status: 500, statusText: 'Server Error' });
  });
});
