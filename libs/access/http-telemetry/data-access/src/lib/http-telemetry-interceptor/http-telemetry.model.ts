export type UrlKeyPolicy = {
  allowlist?: string[];
  denylist?: string[];
  maxLength?: number;
};

export interface HttpTelemetryEvent {
  correlationId?: string;
  method: string;
  urlKey: string;
  status?: number;
  durationMs?: number;
}

export interface HttpTelemetryErrorContext extends HttpTelemetryEvent {
  error?: unknown;
}

export interface HttpTelemetryConfig {
  enabled: boolean;
  samplingRate: number; // 0..1
  headerName: string;
  capture4xx: boolean;
  capture5xx: boolean;
  urlPolicy: UrlKeyPolicy;
}

export const DEFAULT_HTTP_TELEMETRY_CONFIG: HttpTelemetryConfig = {
  enabled: true,
  samplingRate: 0.1,
  headerName: 'x-correlation-id',
  capture4xx: false,
  capture5xx: true,
  urlPolicy: {
    denylist: ['/assets', '/health', '/healthcheck'],
    maxLength: 200
  }
};

export interface ObservabilityService {
  getCorrelationId(): string;
  addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>): void;
  trackEvent(name: string, payload?: Record<string, unknown>): void;
  captureException(err: unknown, context?: Record<string, unknown>): void;
}
