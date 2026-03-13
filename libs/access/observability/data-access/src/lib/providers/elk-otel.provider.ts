import { ObservabilityProvider } from '../observability.provider';
import { ExceptionPayload, TelemetryEvent, Breadcrumb } from '../observability.models';

export class ElkOtelProvider implements ObservabilityProvider {
  constructor(private options?: Record<string, unknown>) {}
  captureException(payload: ExceptionPayload): void {
    void payload;
    // stub: map payload to OTEL/ELK exporter here
    // eslint-disable-next-line no-console
    console.warn('[Observability][ElkOtelProvider] captureException (stub)');
  }
  trackEvent(event: TelemetryEvent): void {
    void event;
    // eslint-disable-next-line no-console
    console.warn('[Observability][ElkOtelProvider] trackEvent (stub)');
  }
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    void breadcrumb;
    // eslint-disable-next-line no-console
    console.warn('[Observability][ElkOtelProvider] addBreadcrumb (stub)');
  }
  async flush(): Promise<void> {
    return Promise.resolve();
  }
}
