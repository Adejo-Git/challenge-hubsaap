import { sanitizeUrlForTelemetry } from './http-telemetry.sanitize';

describe('http-telemetry.sanitize', () => {
  it('removes query strings from url', () => {
    const input = 'https://api.example.com/path/to/resource?token=secret&x=1';
    const out = sanitizeUrlForTelemetry(input, { maxLength: 200 });
    expect(out).toBe('/path/to/resource');
  });

  it('truncates long paths', () => {
    const long = 'https://api.example.com/' + 'a'.repeat(500);
    const out = sanitizeUrlForTelemetry(long, { maxLength: 100 });
    expect(out.length).toBeLessThanOrEqual(100);
  });

  it('maps denylist path to wildcard', () => {
    const input = 'https://api.example.com/assets/images/logo.png';
    const out = sanitizeUrlForTelemetry(input, { denylist: ['/assets'], maxLength: 200 });
    expect(out).toBe('/assets/*');
  });

  it('returns filtered placeholder when not in allowlist', () => {
    const input = 'https://api.example.com/private/data';
    const out = sanitizeUrlForTelemetry(input, { allowlist: ['/public'], maxLength: 200 });
    expect(out).toBe('/<filtered>');
  });
});
