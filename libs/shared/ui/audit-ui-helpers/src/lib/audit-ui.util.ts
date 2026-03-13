import { ErrorCategory, ErrorCode, Severity, StandardError } from '@hub/error-model';

const SENSITIVE_KEY_PARTS = [
  'password',
  'token',
  'authorization',
  'credential',
  'secret',
  'email',
  'cpf',
  'cnpj',
  'phone',
  'document',
];

export function truncate(value: string | undefined, max = 180): string {
  if (!value) return '';
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

export function safeString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
}

export function safeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export function safeIsoTimestamp(value: string | undefined, fallbackIso?: string): string {
  if (!value) return fallbackIso ?? new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return fallbackIso ?? new Date().toISOString();
  }
  return parsed.toISOString();
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
}

function sanitizeValue(value: unknown, maxDepth: number, depth = 0): unknown {
  if (depth >= maxDepth) return '[TRUNCATED_DEPTH]';

  if (typeof value === 'string') {
    return truncate(value, 220);
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => sanitizeValue(entry, maxDepth, depth + 1));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const input = value as Record<string, unknown>;
  const keys = Object.keys(input).slice(0, 40);
  const output: Record<string, unknown> = {};

  for (const key of keys) {
    if (isSensitiveKey(key)) {
      output[key] = '[REDACTED]';
      continue;
    }
    output[key] = sanitizeValue(input[key], maxDepth, depth + 1);
  }

  return output;
}

export function sanitizeMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!meta) return {};
  return sanitizeValue(meta, 4) as Record<string, unknown>;
}

export function buildAuditMappingError(input: {
  correlationId?: string;
  detailsSafe?: Record<string, unknown>;
  technicalMessage?: string;
}): StandardError {
  return {
    category: ErrorCategory.UNKNOWN,
    code: ErrorCode.UNKNOWN_ERROR,
    severity: Severity.WARNING,
    userMessage: 'Não foi possível mapear um evento de auditoria.',
    technicalMessage: input.technicalMessage,
    correlationId: input.correlationId,
    detailsSafe: sanitizeMeta(input.detailsSafe),
    timestamp: new Date().toISOString(),
    source: 'audit-ui-helpers',
  };
}
