import { InjectionToken } from '@angular/core';

export interface HttpBaseConfig {
  allowlistDomains?: string[];
  denylistDomains?: string[];
  publicRoutes?: string[];
  defaultTimeoutMs?: number;
}

export const HTTP_BASE_CONFIG = new InjectionToken<HttpBaseConfig>('HTTP_BASE_CONFIG');

export const DEFAULT_HTTP_BASE_CONFIG: HttpBaseConfig = {
  allowlistDomains: [],
  denylistDomains: [],
  publicRoutes: [],
  defaultTimeoutMs: 30000,
};
