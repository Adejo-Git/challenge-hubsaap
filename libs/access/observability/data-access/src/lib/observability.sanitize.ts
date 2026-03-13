const SENSITIVE_KEY_REGEX = /(password|pwd|token|secret|ssn|cpf|document|cardnumber|ccv|key)/i;
const MAX_STRING_LENGTH = 200;
const MAX_DEPTH = 3;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function truncateString(s: string): string {
  if (s.length <= MAX_STRING_LENGTH) return s;
  return s.slice(0, MAX_STRING_LENGTH) + '…';
}

export function sanitizeValue(key: string, value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (SENSITIVE_KEY_REGEX.test(key)) return '[REDACTED]';
    // redact if whole value looks like a token (heuristic)
    if (/^[A-Za-z0-9-_]{20,}$/.test(value) && SENSITIVE_KEY_REGEX.test(key) === false) return '[REDACTED]';
    return truncateString(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return '[TRUNCATED_ARRAY]';
    return value.map((v) => sanitizeValue(key, v, depth + 1));
  }
  if (isObject(value)) {
    if (depth >= MAX_DEPTH) return '[TRUNCATED_OBJECT]';
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value)) {
      if (SENSITIVE_KEY_REGEX.test(k)) {
        out[k] = '[REDACTED]';
        continue;
      }
      out[k] = sanitizeValue(k, (value as Record<string, unknown>)[k], depth + 1);
    }
    return out;
  }
  try {
    return String(value).slice(0, MAX_STRING_LENGTH);
  } catch {
    return '[UNSERIALIZABLE]';
  }
}

export function sanitizeObject(obj: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!obj) return obj;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    out[k] = sanitizeValue(k, obj[k]);
  }
  return out;
}

export function sanitizeMessage(message?: string): string | undefined {
  if (message == null) return undefined;
  // If message contains sensitive-looking substrings, redact fully
  if (SENSITIVE_KEY_REGEX.test(message) || /^[A-Za-z0-9-_]{20,}$/.test(message)) return '[REDACTED]';
  return truncateString(message);
}

export function sanitizeTags(tags?: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!tags) return tags;
  const out: Record<string, string> = {};
  for (const k of Object.keys(tags)) {
    if (SENSITIVE_KEY_REGEX.test(k)) {
      out[k] = '[REDACTED]';
      continue;
    }
    const v = tags[k];
    out[k] = typeof v === 'string' ? truncateString(v) : '[UNSERIALIZABLE]';
  }
  return out;
}

import { TelemetryContext } from './observability.models';

export function sanitizeContext(ctx?: Record<string, unknown> | undefined): Partial<TelemetryContext> | undefined {
  if (!ctx) return ctx;
  // allowlist for TelemetryContext keys
  const allowed = ['app', 'env', 'toolKey', 'routeKey', 'tenantId', 'projectId'];
  const out: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in ctx) {
      out[k] = sanitizeValue(k, (ctx as Record<string, unknown>)[k]);
    }
  }
  return out;
}
