import { Injectable, Inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, TimeoutError, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HTTP_BASE_CONFIG, HttpBaseConfig } from '../http-base.config';
import { shouldIntercept } from '../http-base.util';
import { fromHttpError, fromException, StandardError } from '@hub/error-model';

@Injectable()
export class ErrorNormalizeInterceptor implements HttpInterceptor {
  constructor(@Inject(HTTP_BASE_CONFIG) private config: HttpBaseConfig) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const url = req.urlWithParams || req.url;
    const shouldApplyTimeout = shouldIntercept(url, this.config);
    const timeoutMs =
      shouldApplyTimeout && typeof this.config?.defaultTimeoutMs === 'number' && this.config.defaultTimeoutMs > 0
        ? this.config.defaultTimeoutMs
        : undefined;

    const request$ = next.handle(req);

    return (timeoutMs ? request$.pipe(timeout({ each: timeoutMs })) : request$).pipe(
      catchError((err: unknown): Observable<never> => {
        try {
          const correlationId = req.headers.get('X-Correlation-Id') || undefined;
          const requestUrl = url;

          let standard: StandardError;
          if (err instanceof HttpErrorResponse) {
            standard = fromHttpError({ status: err.status, error: err.error, message: err.message, url: requestUrl }, correlationId);
            (standard as StandardError & { status?: number }).status = err.status;
          } else if (err instanceof TimeoutError || getErrorName(err) === 'TimeoutError') {
            standard = fromHttpError({ status: 408, error: { message: 'Timeout' }, message: 'Timeout', url: requestUrl }, correlationId);
            (standard as StandardError & { status?: number }).status = 408;
          } else {
            standard = fromException(err, undefined, undefined, correlationId);
          }

          const error = new Error(standard.userMessage || 'HTTP Error') as Error & {
            standardError?: StandardError;
            original?: unknown;
          };
          error.standardError = standard;
          error.original = err;
          return throwError(() => error);
        } catch {
          const fallback = new Error(getErrorMessage(err)) as Error & { original?: unknown };
          fallback.original = err;
          return throwError(() => fallback);
        }
      })
    );
  }
}

function getErrorName(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'name' in error && typeof (error as { name?: unknown }).name === 'string'
    ? (error as { name: string }).name
    : undefined;
}

function getErrorMessage(error: unknown): string {
  return typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
    ? (error as { message: string }).message
    : 'HTTP Error';
}
