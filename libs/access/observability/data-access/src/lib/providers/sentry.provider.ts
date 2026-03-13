import { ObservabilityProvider } from '../observability.provider';
import { ExceptionPayload, TelemetryEvent, Breadcrumb } from '../observability.models';

export class SentryProvider implements ObservabilityProvider {
  constructor(private options?: Record<string, unknown>) {}
  captureException(payload: ExceptionPayload): void {
    void payload;
    // stub: map payload to Sentry SDK here
    // eslint-disable-next-line no-console
    console.warn('[Observability][SentryProvider] captureException (stub)');
  }
  trackEvent(event: TelemetryEvent): void {
    void event;
    // eslint-disable-next-line no-console
    console.warn('[Observability][SentryProvider] trackEvent (stub)');
  }
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    void breadcrumb;
    // eslint-disable-next-line no-console
    console.warn('[Observability][SentryProvider] addBreadcrumb (stub)');
  }
  async flush(): Promise<void> {
    return Promise.resolve();
  }
}
