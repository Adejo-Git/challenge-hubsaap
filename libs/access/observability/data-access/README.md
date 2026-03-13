# ObservabilityService (libs/observability/data-access)

How to integrate `ObservabilityService` in an Angular app (Shell).

## Quick links
- Service factory: `createObservabilityService(cfg?)`
- Interceptor: `HttpTelemetryInterceptor`

## Provider registration (example)

In the App Shell `providers` you can add a factory that creates the service and registers the interceptor:

```ts
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { createObservabilityService } from '@hub/observability/data-access';
import { HttpTelemetryInterceptor } from '@hub/observability/data-access';

export const appProviders = [
  {
    provide: 'OBSERVABILITY_SERVICE',
    useFactory: () => createObservabilityService(window.HUBSAAP_RUNTIME_OBSERVABILITY),
  },
  {
    provide: HTTP_INTERCEPTORS,
    useClass: HttpTelemetryInterceptor,
    multi: true,
  },
];
```

Notes:
- The `HttpTelemetryInterceptor` constructor expects an instance of `ObservabilityService`. When wiring DI in Angular, prefer creating an Angular provider that returns the created instance and use `useFactory` + `deps` where appropriate.
- In dev or Storybook you can continue to use `ObservabilityServiceMock` as done in the Shell sample app.

## Testing guidance
- Use `createObservabilityService()` in unit tests to create isolated instances.
- Use `svc.shutdown()` in `afterEach` to ensure providers flush pending buffers.
- If your Jest environment does not provide `sessionStorage`, mock it (see tests in this lib).

## Sanitization playbook (detailed)

- Purpose: prevent accidental leakage of PII or secrets to telemetry backends. Apply sanitization at the service boundary (before provider calls).

- Rules:
  - Allowlist the `TelemetryContext` fields only: `app`, `env`, `toolKey`, `routeKey`, `tenantId`, `projectId`.
  - Redact by key: any key matching `/password|pwd|token|secret|ssn|cpf|document|cardnumber|ccv|key/i` is replaced with `[REDACTED]`.
  - Heuristic token redaction: long alphanumeric strings (>=20 chars) are considered tokens and redacted.
  - Strings are truncated to `200` chars and nested objects are limited to depth `3` (`[TRUNCATED_OBJECT]` / `[TRUNCATED_ARRAY]` used beyond limit).
  - Non-serializable values become `[UNSERIALIZABLE]`.

- Implementation notes:
  - Use `sanitizeContext()` to prepare context before `setContext()`.
  - Consumers requiring stricter guarantees should supply allowlisted payload shapes themselves.

## Provider adapters & guide

This section explains how to implement and register production adapters for telemetry backends.

- Design contract (`ObservabilityProvider`):
  - `captureException(payload: ExceptionPayload): void | Promise<void>`
  - `trackEvent(event: TelemetryEvent): void | Promise<void>`
  - `addBreadcrumb(breadcrumb: Breadcrumb): void | Promise<void>`
  - `flush?(): Promise<void>` (optional)

- Recommended adapter responsibilities:
  - Map `ExceptionPayload`/`TelemetryEvent` into the vendor SDK types.
  - Call SDK-level scrubbing only as a last resort — prefer upstream sanitization.
  - Implement `flush()` where the vendor provides a buffered transport (call during `svc.shutdown()`).

- Minimal example (Sentry-like pseudocode):

```ts
class SentryProvider implements ObservabilityProvider {
  constructor(opts: Record<string, unknown>) { /* init Sentry SDK with DSN, env, sampleRate */ }
  captureException(p) { Sentry.captureException(new Error(p.message), { extra: p.extra, tags: p.tags, contexts: p.context }); }
  trackEvent(e) { Sentry.captureMessage(e.name, { level: 'info', extra: e.properties }); }
  async flush() { await Sentry.flush(2000); }
}
```

- Registration (Angular DI): prefer a `useFactory` provider that calls `createObservabilityService(window.HUBSAAP_RUNTIME_OBSERVABILITY)` and returns the instance. Provide the `HTTP_INTERCEPTORS` entry for `HttpTelemetryInterceptor` and inject the created instance.

## Testing guidance (expanded)
- Use `createObservabilityService()` in unit tests to create isolated instances.
- Mock `sessionStorage` when running in Node/Jest environments that lack it.
- Use `svc.shutdown()` in `afterEach` to ensure `flush()` is called and no background buffers remain.

## Notes on boundaries and Nx

- This library must be declared with Nx tags to satisfy repository boundaries and to be consumed as a shared asset. The project manifest `project.json` declares:

```
"tags": ["type:shared", "scope:observability", "platform:frontend"]
```

- Ensure your PR does not import internal tool code from other tools; use shared libraries and contracts only.

## Provider adapters
- Stubs exist for `SentryProvider`, `AzureMonitorProvider`, `ElkOtelProvider`. Implement SDK mapping in these adapters for production.
