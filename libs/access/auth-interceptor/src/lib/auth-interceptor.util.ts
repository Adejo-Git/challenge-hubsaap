import type { HttpRequest } from '@angular/common/http';
import { AuthInterceptorConfig, DEFAULT_AUTH_INTERCEPTOR_CONFIG } from './auth-interceptor.config';
import { StandardError, ErrorCategory, ErrorCode, Severity } from '@hub/error-model';

export function normalizeUrlPath(url: string): string {
  try {
    const u = new URL(url, 'http://dummy');
    return u.pathname;
  } catch {
    // fallback for relative paths
    const idx = url.indexOf('?');
    return idx === -1 ? url : url.substring(0, idx);
  }
}

export function isPublicRoute(req: HttpRequest<unknown>, config: AuthInterceptorConfig = DEFAULT_AUTH_INTERCEPTOR_CONFIG): boolean {
  const path = normalizeUrlPath(req.url);
  if (config.publicPaths) {
    for (const p of config.publicPaths) {
      if (path.startsWith(p)) return true;
    }
  }
  if (config.authIgnoredPaths) {
    for (const p of config.authIgnoredPaths) {
      if (path === p) return true;
    }
  }
  return false;
}

export function domainFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

export function shouldAttachAuth(req: HttpRequest<unknown>, config: AuthInterceptorConfig = DEFAULT_AUTH_INTERCEPTOR_CONFIG): boolean {
  if (isPublicRoute(req, config)) return false;
  const domain = domainFromUrl(req.url);
  if (domain) {
    if (config.denylistDomains && config.denylistDomains.includes(domain)) return false;
    if (config.allowlistDomains && config.allowlistDomains.length > 0) {
      return config.allowlistDomains.includes(domain);
    }
  }
  // default: attach when not explicitly public or denied
  return true;
}

export function sanitizeError(err: unknown): StandardError {
  const now = new Date().toISOString();
  let status: number | null = null;
  let correlationId: string | undefined = undefined;
  let message: string | undefined = undefined;

  if (typeof err === 'object' && err !== null) {
    const e = err as { status?: unknown; correlationId?: unknown; message?: unknown };
    if (typeof e.status === 'number') status = e.status;
    if (typeof e.correlationId === 'string') correlationId = e.correlationId;
    if (typeof e.message === 'string') message = e.message;
  }
  if (status === 401) {
    const se: StandardError = {
      category: ErrorCategory.AUTH,
      code: ErrorCode.UNAUTHENTICATED,
      severity: Severity.ERROR,
      userMessage: message || 'Não autenticado',
      technicalMessage: message ?? JSON.stringify(err),
      correlationId,
      timestamp: now
    };
    return se;
  }
  if (status === 403) {
    const se: StandardError = {
      category: ErrorCategory.PERMISSION,
      code: ErrorCode.PERMISSION_DENIED,
      severity: Severity.ERROR,
      userMessage: message || 'Acesso negado',
      technicalMessage: message ?? JSON.stringify(err),
      correlationId,
      timestamp: now
    };
    return se;
  }
  const se: StandardError = {
    category: ErrorCategory.UNKNOWN,
    code: ErrorCode.UNKNOWN_ERROR,
    severity: Severity.ERROR,
    userMessage: message || 'Erro desconhecido',
    technicalMessage: message ?? JSON.stringify(err),
    correlationId,
    timestamp: now
  };
  return se;
}
