import { Inject, Injectable, Optional } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { ObservabilityService, HttpTelemetryConfig, DEFAULT_HTTP_TELEMETRY_CONFIG } from './http-telemetry.model';
import { sanitizeUrlForTelemetry, getUrlKey } from './http-telemetry.sanitize';
import { HTTP_TELEMETRY_CONFIG_TOKEN, OBSERVABILITY_SERVICE_TOKEN, HTTP_TELEMETRY_SAMPLER_TOKEN } from './http-telemetry.config';

/**
 * Helper função para determinar se a URL deve ser registrada em telemetria
 * (respeitando denylist/allowlist).
 * Retorna true se telemetria deve prosseguir, false se deve ser filtrada.
 */
function shouldTelemetry(urlKey: string, policy?: { denylist?: string[]; allowlist?: string[] }): boolean {
  if (!policy) return true;
  
  // Se está em denylist, não registrar telemetria
  if (policy.denylist && policy.denylist.length > 0) {
    for (const d of policy.denylist) {
      if (urlKey.startsWith(d)) {
        return false;
      }
    }
  }
  
  // Se há allowlist, registrar somente se estiver dentro
  if (policy.allowlist && policy.allowlist.length > 0) {
    return policy.allowlist.some((a) => urlKey.startsWith(a));
  }
  
  return true;
}

@Injectable()
export class HttpTelemetryInterceptor implements HttpInterceptor {
  private config: HttpTelemetryConfig;

  constructor(
    @Inject(OBSERVABILITY_SERVICE_TOKEN) @Optional() private observability?: ObservabilityService,
    @Inject(HTTP_TELEMETRY_CONFIG_TOKEN) @Optional() config?: Partial<HttpTelemetryConfig>,
    @Inject(HTTP_TELEMETRY_SAMPLER_TOKEN) @Optional() private sampler?: () => number
  ) {
    this.config = { ...DEFAULT_HTTP_TELEMETRY_CONFIG, ...(config || {}) } as HttpTelemetryConfig;
  }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.config.enabled) {
      return next.handle(req);
    }

    const correlationId = this.observability?.getCorrelationId?.() || '';
    const headerName = this.config.headerName || DEFAULT_HTTP_TELEMETRY_CONFIG.headerName;

    // Extrair urlKey (sem informação binária, apenas path sanitizado)
    const rawUrlKey = getUrlKey(req.urlWithParams, this.config.urlPolicy);
    const sanitizedUrlKey = sanitizeUrlForTelemetry(req.urlWithParams, this.config.urlPolicy);
    
    // Verificar se deve registrar telemetria (respeita denylist/allowlist)
    const doTelemetry = shouldTelemetry(rawUrlKey, this.config.urlPolicy);

    // Sempre propagar header, independente de filtro
    const cloned = req.clone({ setHeaders: { [headerName]: correlationId } });

    // Só adicionar breadcrumb de início se passar por filtro
    if (doTelemetry) {
      this.observability?.addBreadcrumb?.(`HTTP ${req.method} ${sanitizedUrlKey}`, 'http', { method: req.method, urlKey: sanitizedUrlKey });
    }

    const start = Date.now();

    return next.handle(cloned).pipe(
      tap((event) => {
        if (event instanceof HttpResponse && doTelemetry) {
          const duration = Date.now() - start;
          const payload = {
            correlationId,
            method: req.method,
            urlKey: sanitizedUrlKey,
            status: event.status,
            durationMs: duration
          };

          // sampling: always send if status is 5xx and config.capture5xx
          const is5xx = event.status >= 500 && event.status < 600;
          const randomValue = this.sampler ? this.sampler() : Math.random();
          const send = is5xx && this.config.capture5xx ? true : randomValue < (this.config.samplingRate ?? 0);

          if (send) {
            this.observability?.trackEvent?.('http.response', payload);
          }

          this.observability?.addBreadcrumb?.(`HTTP ${req.method} ${sanitizedUrlKey} - ${event.status}`, 'http', { ...payload });
        }
      }),
      catchError((err: unknown) => {
        const duration = Date.now() - start;
        const status = err instanceof HttpErrorResponse ? err.status : undefined;
        const context = {
          correlationId,
          method: req.method,
          urlKey: sanitizedUrlKey,
          status,
          durationMs: duration
        };

        // Sempre capturar 5xx (mesmo com filtro), mas respeitar 4xx
        const shouldCapture = (status && status >= 500 && this.config.capture5xx) || 
                              (doTelemetry && status && status >= 400 && status < 500 && this.config.capture4xx);

        if (shouldCapture) {
          this.observability?.captureException?.(err, context);
        }

        if (doTelemetry) {
          this.observability?.addBreadcrumb?.(`HTTP ${req.method} ${sanitizedUrlKey} - error`, 'http', { ...context });
        }

        throw err;
      }),
      finalize(() => {
        // no-op for now; breadcrumbs already added on success/error
      })
    );
  }
}
