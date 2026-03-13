import { ExceptionPayload, TelemetryEvent, Breadcrumb } from './observability.models';

export interface ObservabilityProvider {
  captureException(payload: ExceptionPayload): void | Promise<void>;
  trackEvent(event: TelemetryEvent): void | Promise<void>;
  addBreadcrumb(breadcrumb: Breadcrumb): void | Promise<void>;
  flush?(): Promise<void>;
}

export const OBSERVABILITY_PROVIDER_TOKEN = 'OBSERVABILITY_PROVIDER_TOKEN';
