export interface TelemetryContext {
  app: string;
  env: string;
  toolKey?: string;
  routeKey?: string;
  tenantId?: string;
  projectId?: string;
}

export interface TelemetryEvent {
  name: string;
  properties?: Record<string, unknown>;
  context?: TelemetryContext;
  correlationId?: string;
}

export type BreadcrumbLevel = 'info' | 'warn' | 'error';

export interface Breadcrumb {
  message: string;
  category?: string;
  level?: BreadcrumbLevel;
  timestamp?: string;
  correlationId?: string;
}

export interface ExceptionContext {
  correlationId?: string;
  url?: string;
  code?: string | number;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  context?: TelemetryContext;
}

export interface ExceptionPayload {
  error: unknown;
  message?: string;
  code?: string | number;
  url?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  correlationId?: string;
  context?: TelemetryContext;
}
