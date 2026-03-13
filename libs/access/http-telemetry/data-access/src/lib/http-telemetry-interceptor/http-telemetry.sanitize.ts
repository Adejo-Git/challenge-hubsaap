function stripQuery(url: string): string {
  try {
    const u = new URL(url, 'http://localhost');
    u.search = '';
    return u.pathname || '/';
  } catch {
    // fallback: remove after ?
    const idx = url.indexOf('?');
    return idx >= 0 ? url.substring(0, idx) : url;
  }
}

export function getUrlKey(rawUrl: string, policy?: { allowlist?: string[]; denylist?: string[]; maxLength?: number }): string {
  const path = stripQuery(rawUrl);

  if (policy) {
    if (policy.denylist) {
      for (const d of policy.denylist) {
        if (path.startsWith(d)) {
          return d + '/*';
        }
      }
    }
    if (policy.allowlist && policy.allowlist.length > 0) {
      for (const a of policy.allowlist) {
        if (path.startsWith(a)) {
          return path.substring(0, policy.maxLength || 200);
        }
      }
      // not in allowlist -> generic
      return '/<filtered>';
    }
  }

  const max = policy?.maxLength ?? 200;
  const trimmed = path.length > max ? path.substring(0, max) : path;
  return trimmed;
}

export function sanitizeUrlForTelemetry(rawUrl: string, policy?: { allowlist?: string[]; denylist?: string[]; maxLength?: number }): string {
  return getUrlKey(rawUrl, policy);
}
