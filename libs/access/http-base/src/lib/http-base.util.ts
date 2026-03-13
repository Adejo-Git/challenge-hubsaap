import { HttpBaseConfig } from './http-base.config';
import { ContextSnapshot } from './http-base.module';

export function isSameOrigin(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

export function shouldIntercept(url: string, config: HttpBaseConfig): boolean {
  if (!url) return false;
  if (config.publicRoutes && config.publicRoutes.some(r => url.includes(r))) return false;
  try {
    const u = new URL(url, window.location.origin);
    const hostname = u.hostname;
    if (config.denylistDomains && config.denylistDomains.includes(hostname)) return false;
    if (config.allowlistDomains && config.allowlistDomains.length > 0) {
      return config.allowlistDomains.includes(hostname) || isSameOrigin(url);
    }
    return isSameOrigin(url);
  } catch {
    return true;
  }
}

export function sanitizeHeaderValue(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  return String(value).trim();
}

export function buildContextHeaders(snapshot?: ContextSnapshot | null): Record<string, string> {
  if (!snapshot) return {};
  const headers: Record<string, string> = {};
  const tenantId = sanitizeHeaderValue(snapshot.tenantId);
  const projectId = sanitizeHeaderValue(snapshot.projectId);
  if (tenantId) headers['X-Tenant-Id'] = tenantId;
  if (projectId) headers['X-Project-Id'] = projectId;
  return headers;
}
