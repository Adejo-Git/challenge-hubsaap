import { createObservabilityService } from './observability.service';
import * as corr from './observability.correlation';
import { ConsoleProvider } from './providers/console.provider';
import { sanitizeObject } from './observability.sanitize';
import { Breadcrumb, ExceptionPayload, TelemetryEvent } from './observability.models';
import { ObservabilityProvider } from './observability.provider';

type SessionStorageMock = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear'>;
type GlobalWithSessionStorage = typeof globalThis & { sessionStorage?: SessionStorageMock };

type SpyProvider = ObservabilityProvider & {
  captureException: jest.Mock<void, [ExceptionPayload]>;
  trackEvent: jest.Mock<void, [TelemetryEvent]>;
  addBreadcrumb: jest.Mock<void, [Breadcrumb]>;
  flush?: jest.Mock<Promise<void>, []>;
};

const getRequiredRecord = (value: unknown): Record<string, unknown> => {
  expect(value).toBeDefined();
  expect(typeof value).toBe('object');
  return value as Record<string, unknown>;
};

const createSpyProvider = (withFlush = false): SpyProvider => ({
  captureException: jest.fn<void, [ExceptionPayload]>(),
  trackEvent: jest.fn<void, [TelemetryEvent]>(),
  addBreadcrumb: jest.fn<void, [Breadcrumb]>(),
  ...(withFlush ? { flush: jest.fn<Promise<void>, []>().mockResolvedValue(undefined) } : {}),
});

describe('ObservabilityService (basic)', () => {
  let realSessionStorage: SessionStorageMock | undefined;
  const globalWithStorage = globalThis as GlobalWithSessionStorage;

  beforeEach(() => {
    // mock sessionStorage for deterministic tests when not present
    realSessionStorage = globalWithStorage.sessionStorage;
    const store: Record<string, string> = {};
    globalWithStorage.sessionStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    };
  });

  afterEach(() => {
    globalWithStorage.sessionStorage = realSessionStorage;
  });

  it('should persist correlationId across calls', () => {
    const id1 = corr.getOrCreateCorrelationId();
    const id2 = corr.getOrCreateCorrelationId();
    expect(id1).toBeDefined();
    expect(id1).toEqual(id2);
  });

  it('sanitizeObject should redact sensitive keys', () => {
    const input = { password: 'secret', name: 'João', nested: { token: 'abc', note: 'ok' } };
    const out = sanitizeObject(input as Record<string, unknown>);
    const safeOut = getRequiredRecord(out);
    const nested = getRequiredRecord(safeOut.nested);

    expect(safeOut.password).toBe('[REDACTED]');
    expect(nested.token).toBe('[REDACTED]');
    expect(safeOut.name).toBe('João');
  });

  it('should allow provider swapping', () => {
    const svc = createObservabilityService();
    const provider = new ConsoleProvider();
    svc.setProvider(provider);
    // smoke call
    svc.trackEvent('test.event', { foo: 'bar' });
    svc.addBreadcrumb('navigated to x');
    expect(svc.getCorrelationId()).toBeDefined();
  });

  it('should sanitize payloads before sending to provider', async () => {
    const svc = createObservabilityService();
    const spyProvider = createSpyProvider(true);
    svc.setProvider(spyProvider);

    svc.trackEvent('evt', { password: 'secret', safe: 'ok' });
    expect(spyProvider.trackEvent).toHaveBeenCalledTimes(1);
    const calledEvent = spyProvider.trackEvent.mock.calls[0][0];
    expect(calledEvent.properties?.password).toBe('[REDACTED]');
    expect(calledEvent.properties?.safe).toBe('ok');

    svc.captureException('token abcdefghijklmnopqrst', {
      extra: { token: 'xxx', note: 'ok' },
      tags: { cardnumber: '4111' },
    });
    expect(spyProvider.captureException).toHaveBeenCalledTimes(1);
    const exc = spyProvider.captureException.mock.calls[0][0];
    expect(exc.message).toBe('[REDACTED]');
    expect(exc.extra?.token).toBe('[REDACTED]');
    expect(exc.tags?.cardnumber).toBe('[REDACTED]');

    svc.addBreadcrumb('user logged with token 12345678901234567890');
    expect(spyProvider.addBreadcrumb).toHaveBeenCalledTimes(1);
    const bc = spyProvider.addBreadcrumb.mock.calls[0][0];
    expect(bc.message).toBe('[REDACTED]');

    // shutdown should call flush
    await svc.shutdown();
    expect(spyProvider.flush).toHaveBeenCalled();
  });

  it('should accept legacy payloads for captureException', () => {
    const svc = createObservabilityService();
    const spyProvider = createSpyProvider();
    svc.setProvider(spyProvider);

    svc.captureException({
      error: new Error('boom'),
      message: 'token abcdefghijklmnopqrst',
      extra: { token: 'xxx', note: 'ok' },
      tags: { cardnumber: '4111' },
    });

    expect(spyProvider.captureException).toHaveBeenCalledTimes(1);
    const exc = spyProvider.captureException.mock.calls[0][0];
    expect(exc.message).toBe('[REDACTED]');
    expect(exc.extra?.token).toBe('[REDACTED]');
    expect(exc.tags?.cardnumber).toBe('[REDACTED]');
  });

  it('should honor samplingRate=0 (no events)', () => {
    const svc = createObservabilityService({ samplingRate: 0 });
    const spyProvider = createSpyProvider();
    svc.setProvider(spyProvider);

    svc.trackEvent('evt', { safe: 'ok' });
    svc.addBreadcrumb('nav');
    svc.captureException(new Error('boom'));

    expect(spyProvider.trackEvent).not.toHaveBeenCalled();
    expect(spyProvider.addBreadcrumb).not.toHaveBeenCalled();
    expect(spyProvider.captureException).not.toHaveBeenCalled();
  });

  it('should honor enabled=false (no events)', () => {
    const svc = createObservabilityService({ enabled: false, samplingRate: 1 });
    const spyProvider = createSpyProvider();
    svc.setProvider(spyProvider);

    svc.trackEvent('evt', { safe: 'ok' });
    svc.addBreadcrumb('nav');
    svc.captureException(new Error('boom'));

    expect(spyProvider.trackEvent).not.toHaveBeenCalled();
    expect(spyProvider.addBreadcrumb).not.toHaveBeenCalled();
    expect(spyProvider.captureException).not.toHaveBeenCalled();
  });

  it('should honor samplingRate=1 (always emit)', () => {
    const svc = createObservabilityService({ samplingRate: 1 });
    const spyProvider = createSpyProvider();
    svc.setProvider(spyProvider);

    svc.trackEvent('evt', { safe: 'ok' });
    svc.addBreadcrumb('nav');
    svc.captureException(new Error('boom'));

    expect(spyProvider.trackEvent).toHaveBeenCalledTimes(1);
    expect(spyProvider.addBreadcrumb).toHaveBeenCalledTimes(1);
    expect(spyProvider.captureException).toHaveBeenCalledTimes(1);
  });
});
