import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ObservabilityService } from './observability.service';

@Injectable()
export class HttpTelemetryInterceptor implements HttpInterceptor {
  constructor(private observability: ObservabilityService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const correlationId = this.observability.getCorrelationId() || '';
    const cloned = req.clone({ setHeaders: { 'X-Correlation-Id': correlationId } });
    const start = Date.now();
    return next.handle(cloned).pipe(
      tap({
        error: (err) => {
          try {
            this.observability.captureException({ error: err, message: String(err?.message || err), url: req.url, correlationId });
          } catch {
            // noop
          }
        },
        complete: () => {
          const duration = Date.now() - start;
          try {
            this.observability.trackEvent('http.request', { url: req.url, method: req.method, duration });
          } catch {
            // noop
          }
        },
      })
    );
  }
}
