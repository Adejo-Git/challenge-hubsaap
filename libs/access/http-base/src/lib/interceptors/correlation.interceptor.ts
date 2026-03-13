import { Injectable, Inject, Optional } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HTTP_BASE_CONFIG, HttpBaseConfig } from '../http-base.config';
import { shouldIntercept } from '../http-base.util';
import { OBSERVABILITY_SERVICE, ObservabilityHttpAdapter } from '../http-base.module';

function shortId(): string {
  // simple short id for correlation (not cryptographically strong)
  return Math.random().toString(36).slice(2, 10);
}

type HttpErrorLike = {
  status?: number;
  code?: string;
  name?: string;
  standardError?: {
    status?: number;
    code?: string;
  };
};

function getHttpErrorLike(value: unknown): HttpErrorLike {
  return typeof value === 'object' && value !== null ? (value as HttpErrorLike) : {};
}

@Injectable()
export class CorrelationInterceptor implements HttpInterceptor {
  constructor(
    @Inject(HTTP_BASE_CONFIG) private config: HttpBaseConfig,
    @Optional() @Inject(OBSERVABILITY_SERVICE) private observability?: ObservabilityHttpAdapter
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const url = req.urlWithParams || req.url;
    if (!shouldIntercept(url, this.config)) {
      return next.handle(req);
    }

    const existing = req.headers.get('X-Correlation-Id');
    const correlationId = existing || shortId();
    const cloned = req.clone({ setHeaders: { 'X-Correlation-Id': correlationId } });

    const start = Date.now();
    let status: number | undefined;
    let errorCode: string | undefined;
    let failed = false;

    if (this.observability && typeof this.observability.recordStart === 'function') {
      try { this.observability.recordStart({ url, correlationId, method: req.method }); } catch { /* noop */ }
    }

    const recordEnd = () => {
      const duration = Date.now() - start;
      if (this.observability && typeof this.observability.recordEnd === 'function') {
        try {
          this.observability.recordEnd({
            url,
            correlationId,
            method: req.method,
            duration,
            status,
            errorCode,
            failed,
            ok: !failed,
          });
        } catch {
          /* noop */
        }
      }
    };

    return next.handle(cloned).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            status = event.status;
            // Record end before passing the response downstream (tests assert inside subscribe).
            recordEnd();
          }
        },
        error: (err) => {
          failed = true;
          const error = getHttpErrorLike(err);
          status = error.status ?? error.standardError?.status;
          if (error.name === 'TimeoutError') {
            status = status ?? 408;
          }
          errorCode = error.standardError?.code ?? error.code ?? error.name;
          // Record end before passing the error downstream.
          recordEnd();
        },
      })
    );
  }
}
