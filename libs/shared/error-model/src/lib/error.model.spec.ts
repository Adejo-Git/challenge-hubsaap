import { fromHttpError, fromDenyReason, fromException } from './error.mappers';
import { sanitize, buildUserMessage, isRetryable } from './error.util';
import { ErrorCode } from './error.model';

// Local helper type matching internal HttpErrorLike (test-only)
type HttpErrorLike = { status: number; error?: unknown; message?: string; url?: string };

describe('ErrorModel mappers and utils', () => {
  it('sanitizes Authorization header and PII', () => {
    const input = {
      headers: { Authorization: 'Bearer abc.def.ghi' },
      email: 'user@example.com',
      cpf: '123.456.789-10',
    } as unknown as Record<string, unknown>;
    const out = sanitize(input) as Record<string, unknown>;
    expect((out.headers as Record<string, unknown>).Authorization).toBe('[REDACTED]');
    expect(out.email).toBe('[REDACTED_EMAIL]');
    expect(out.cpf).toBe('[REDACTED_CPF]');
  });

  it('truncates large payloads and preserves predictable shape', () => {
    const big = { data: 'x'.repeat(2000) };
    const out = sanitize(big) as Record<string, unknown>;
    expect(out).toBeDefined();
    expect(typeof out).toBe('object');
    expect(out.__truncated).toBe(true);
    expect(typeof out.preview).toBe('string');
    expect((out.preview as string).length).toBeLessThanOrEqual(1024);
  });

  it('maps HTTP statuses to codes', () => {
    const e401 = fromHttpError({ status: 401, message: 'unauth' } as unknown as HttpErrorLike);
    expect(e401.code).toBe(ErrorCode.UNAUTHENTICATED);

    const e403 = fromHttpError({ status: 403 } as unknown as HttpErrorLike);
    expect(e403.code).toBe(ErrorCode.PERMISSION_DENIED);

    const e404 = fromHttpError({ status: 404 } as unknown as HttpErrorLike);
    expect(e404.code).toBe(ErrorCode.NOT_FOUND);

    const e500 = fromHttpError({ status: 500 } as unknown as HttpErrorLike);
    expect(e500.code).toBe(ErrorCode.HTTP_SERVER_ERROR);

    const eTimeout = fromHttpError({ status: 504 } as unknown as HttpErrorLike);
    expect(eTimeout.code).toBe(ErrorCode.HTTP_TIMEOUT);
  });

  it('maps deny reasons', () => {
    const unauth = fromDenyReason('unauthenticated');
    expect(unauth.code).toBe('UNAUTHENTICATED');

    const forbidden = fromDenyReason('forbidden');
    expect(forbidden.code).toBe('PERMISSION_DENIED');
  });

  it('fromException handles generic errors', () => {
    const ex = fromException(new Error('boom'));
    expect(ex.code).toBeDefined();
    expect(ex.technicalMessage).toContain('boom');
  });

  it('isRetryable logic', () => {
    expect(isRetryable(ErrorCode.HTTP_TIMEOUT)).toBe(true);
    expect(isRetryable(ErrorCode.PERMISSION_DENIED)).toBe(false);
  });

  it('buildUserMessage returns pt-BR messages', () => {
    const msg = buildUserMessage(ErrorCode.AUTH_EXPIRED);
    expect(msg).toContain('sessão');
  });

  it('sanitizes with depth limit', () => {
    const input = { a: { b: { c: { d: { e: 'x' } } } } };
    const out = sanitize(input) as Record<string, unknown>;
    const a = out.a as Record<string, unknown>;
    const b = a.b as Record<string, unknown>;
    const c = b.c as Record<string, unknown>;
    expect(c.d as unknown).toBe('[TRUNCATED_DEPTH]');
  });

  it('sanitizes with array/key limits', () => {
    const bigArray = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const bigObject: Record<string, unknown> = {};
    for (let i = 0; i < 80; i += 1) {
      bigObject[`k${i}`] = `v${i}`;
    }
    const out = sanitize({ bigArray, bigObject }) as Record<string, unknown>;
    expect(Array.isArray(out.bigArray)).toBe(true);
    expect((out.bigArray as unknown[]).length).toBeLessThanOrEqual(30);
    expect(Object.keys(out.bigObject as Record<string, unknown>).length).toBeLessThanOrEqual(50);
  });
});
