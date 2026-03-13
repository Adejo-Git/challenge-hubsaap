import { NgModule, ModuleWithProviders, InjectionToken } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { CorrelationInterceptor } from './interceptors/correlation.interceptor';
import { ContextHeadersInterceptor } from './interceptors/context-headers.interceptor';
import { ErrorNormalizeInterceptor } from './interceptors/error-normalize.interceptor';
import { HTTP_BASE_CONFIG, DEFAULT_HTTP_BASE_CONFIG } from './http-base.config';

export type ObservabilityHttpAdapter = {
  recordStart?: (payload: Record<string, unknown>) => void;
  recordEnd?: (payload: Record<string, unknown>) => void;
};

export type ContextSnapshot = {
  tenantId?: string;
  projectId?: string;
} & Record<string, unknown>;

export const OBSERVABILITY_SERVICE = new InjectionToken<ObservabilityHttpAdapter>('OBSERVABILITY_SERVICE');
export const CONTEXT_SNAPSHOT = new InjectionToken<ContextSnapshot>('CONTEXT_SNAPSHOT');

/**
 * Expected integration guidance:
 * - `AuthInterceptor` should be registered before or after `HttpBase` according to the project's auth policy.
 * - Recommended ordering: AuthInterceptor (adds Authorization) -> CorrelationInterceptor -> ContextHeadersInterceptor -> ErrorNormalizeInterceptor.
 * Add `AuthInterceptor` provider in the AppModule and ensure provider order if you rely on header presence.
 */
export const EXPECTED_INTERCEPTOR_ORDER = 'Auth -> Correlation -> Context -> ErrorNormalize';

@NgModule({})
export class HttpBaseModule {
  static forRoot(config?: Partial<typeof DEFAULT_HTTP_BASE_CONFIG>): ModuleWithProviders<HttpBaseModule> {
    return {
      ngModule: HttpBaseModule,
      providers: [
        { provide: HTTP_BASE_CONFIG, useValue: { ...DEFAULT_HTTP_BASE_CONFIG, ...(config || {}) } },
        { provide: HTTP_INTERCEPTORS, useClass: CorrelationInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ContextHeadersInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorNormalizeInterceptor, multi: true },
      ],
    };
  }
}

export { HTTP_BASE_CONFIG, DEFAULT_HTTP_BASE_CONFIG };
export { CorrelationInterceptor };
export { ContextHeadersInterceptor };
export { ErrorNormalizeInterceptor };
