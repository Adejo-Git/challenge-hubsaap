export interface AuthInterceptorConfig {
  allowlistDomains?: string[];
  denylistDomains?: string[];
  publicPaths?: string[]; // paths (prefix) that should not receive auth
  authIgnoredPaths?: string[]; // explicit endpoints to ignore (login, refresh, callback)
  authHeaderName?: string;
  correlationHeaderName?: string;
  invalidateOn401?: boolean;
}

export const DEFAULT_AUTH_INTERCEPTOR_CONFIG: AuthInterceptorConfig = {
  allowlistDomains: [],
  denylistDomains: [],
  publicPaths: ['/public', '/assets', '/health'],
  authIgnoredPaths: ['/auth/login', '/auth/refresh', '/auth/callback'],
  authHeaderName: 'Authorization',
  correlationHeaderName: 'X-Correlation-Id',
  invalidateOn401: true
};
