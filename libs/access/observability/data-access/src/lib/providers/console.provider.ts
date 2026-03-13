import { ObservabilityProvider } from '../observability.provider';
import { ExceptionPayload, TelemetryEvent, Breadcrumb } from '../observability.models';

export class ConsoleProvider implements ObservabilityProvider {
  captureException(payload: ExceptionPayload): void {
    // Always keep minimal info to console to avoid leaking
    // sensitive data in dev; payload should be sanitized upstream.
    // eslint-disable-next-line no-console
    console.error('[Observability][Exception]', {
      message: payload.message,
      code: payload.code,
      url: payload.url,
      tags: payload.tags,
      correlationId: payload.correlationId,
      extra: payload.extra,
    });
  }

  trackEvent(event: TelemetryEvent): void {
    // eslint-disable-next-line no-console
    console.info('[Observability][Event]', event.name, event.properties, { correlationId: event.correlationId });
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    // eslint-disable-next-line no-console
    console.debug('[Observability][Breadcrumb]', breadcrumb.timestamp || new Date().toISOString(), breadcrumb.category, breadcrumb.message, { correlationId: breadcrumb.correlationId });
  }

  async flush(): Promise<void> {
    return Promise.resolve();
  }
}
