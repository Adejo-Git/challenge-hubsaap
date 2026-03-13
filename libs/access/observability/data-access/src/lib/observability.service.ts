import { ExceptionPayload, TelemetryEvent, Breadcrumb, TelemetryContext, ExceptionContext } from './observability.models';
import { sanitizeObject, sanitizeMessage, sanitizeTags, sanitizeContext } from './observability.sanitize';
import { getOrCreateCorrelationId, getCorrelationId, resetCorrelationId } from './observability.correlation';
import { getRuntimeConfig, createProviderFromConfig, ObservabilityRuntimeConfig } from './observability.config';
import { ObservabilityProvider } from './observability.provider';

type FlushCapableProvider = ObservabilityProvider & {
  flush?: () => Promise<void>;
};

export class ObservabilityService {
  private provider: ObservabilityProvider;
  private context: TelemetryContext | null = null;
  private enabled = true;
  private sampling = 1;

  constructor(cfg?: ObservabilityRuntimeConfig) {
    const cfgResolved = cfg || getRuntimeConfig();
    this.enabled = cfgResolved.enabled !== false;
    this.sampling = typeof cfgResolved.samplingRate === 'number' ? cfgResolved.samplingRate : 1;
    this.provider = createProviderFromConfig(cfgResolved);
    // create correlation id at init to ensure availability for interceptors
    getOrCreateCorrelationId();
  }

  getCorrelationId(): string | null {
    return getCorrelationId();
  }

  setContext(partial: Partial<TelemetryContext>): void {
    const base = { ...(this.context || { app: 'hubsaap', env: 'unknown' }), ...partial } as TelemetryContext;
    const sanitized = (sanitizeContext(base as unknown as Record<string, unknown> | undefined) as Partial<TelemetryContext>) || {};
    this.context = { ...base, ...sanitized } as TelemetryContext;
  }

  resetForTests(cfg?: ObservabilityRuntimeConfig): void {
    // allow tests to reset internal state deterministically
    const cfgResolved = cfg || getRuntimeConfig();
    this.enabled = cfgResolved.enabled !== false;
    this.sampling = typeof cfgResolved.samplingRate === 'number' ? cfgResolved.samplingRate : 1;
    this.provider = createProviderFromConfig(cfgResolved);
    this.context = null;
    resetCorrelationId();
  }

  private shouldSample(): boolean {
    if (!this.enabled) return false;
    if (this.sampling >= 1) return true;
    return Math.random() < this.sampling;
  }

  private buildPayloadFromError(error: unknown, context?: ExceptionContext): ExceptionPayload {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
    return {
      error,
      message,
      code: context?.code,
      url: context?.url,
      tags: context?.tags,
      extra: context?.extra,
      correlationId: context?.correlationId,
      context: context?.context,
    };
  }

  private isLegacyPayload(input: unknown): input is ExceptionPayload {
    if (!input || typeof input !== 'object') return false;
    if (input instanceof Error) return false;
    const payload = input as Record<string, unknown>;
    return 'error' in payload || 'message' in payload || 'tags' in payload || 'extra' in payload;
  }

  captureException(error: unknown, context?: ExceptionContext): void;
  captureException(payload: ExceptionPayload): void;
  captureException(errorOrPayload: unknown, context?: ExceptionContext): void {
    if (!this.shouldSample()) return;
    const rawPayload = this.isLegacyPayload(errorOrPayload) && !context
      ? (errorOrPayload as ExceptionPayload)
      : this.buildPayloadFromError(errorOrPayload, context);

    const safe: ExceptionPayload = {
      ...rawPayload,
      message: sanitizeMessage(rawPayload.message),
      extra: sanitizeObject(rawPayload.extra || undefined) as Record<string, unknown> | undefined,
      tags: sanitizeTags(rawPayload.tags as Record<string, string> | undefined) as Record<string, string> | undefined,
      correlationId: rawPayload.correlationId || this.getCorrelationId() || undefined,
      context: (sanitizeContext(rawPayload.context as unknown as Record<string, unknown> | undefined) as Partial<TelemetryContext>) as TelemetryContext | undefined || undefined,
    };
    try {
      this.provider.captureException(safe);
    } catch {
      // provider failed — fail silently
    }
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    if (!this.shouldSample()) return;
    const safeProps = sanitizeObject(properties || undefined) as Record<string, unknown> | undefined;
    const event: TelemetryEvent = {
      name,
      properties: safeProps,
      correlationId: this.getCorrelationId() || undefined,
      context: this.context || undefined,
    };
    try {
      this.provider.trackEvent(event);
    } catch {
      // noop
    }
  }

  addBreadcrumb(message: string, category = 'ui', level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.shouldSample()) return;
    const breadcrumb: Breadcrumb = {
      message: sanitizeMessage(message) || '',
      category,
      level,
      timestamp: new Date().toISOString(),
      correlationId: this.getCorrelationId() || undefined,
    };
    try {
      this.provider.addBreadcrumb(breadcrumb);
    } catch {
      // noop
    }
  }

  // Allow provider swap in runtime for testing or dynamic config
  setProvider(provider: ObservabilityProvider): void {
    this.provider = provider;
  }

  async shutdown(): Promise<void> {
    try {
      const flush = (this.provider as FlushCapableProvider).flush;
      if (typeof flush === 'function') {
        await flush.call(this.provider);
      }
    } catch {
      // swallow
    }
  }
}

export function createObservabilityService(cfg?: ObservabilityRuntimeConfig): ObservabilityService {
  return new ObservabilityService(cfg);
}
