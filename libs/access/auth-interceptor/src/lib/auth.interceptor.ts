import type { HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthInterceptorConfig, DEFAULT_AUTH_INTERCEPTOR_CONFIG } from './auth-interceptor.config';
import { shouldAttachAuth, sanitizeError } from './auth-interceptor.util';
import { AuthSessionService } from '@hub/auth-session';
import { ObservabilityService as ObservabilitySvc } from '@hub/observability/data-access';
import { StandardError } from '@hub/error-model';
import { ErrorCode } from '@hub/error-model';

export class AuthInterceptor {
  constructor(
    public authSession: AuthSessionService,
    public observability: ObservabilitySvc,
    public config: AuthInterceptorConfig = DEFAULT_AUTH_INTERCEPTOR_CONFIG
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const attach = shouldAttachAuth(req, this.config);
    let outReq = req;

    if (attach) {
      try {
        const headerName = this.config.authHeaderName || DEFAULT_AUTH_INTERCEPTOR_CONFIG.authHeaderName;
        const token = typeof this.authSession?.getAccessToken === 'function' ? this.authSession.getAccessToken() : null;
        const headerValue = token ? `Bearer ${token}` : null;
        if (headerValue) {
          outReq = outReq.clone({ setHeaders: { [headerName as string]: headerValue } });
        }
      } catch {
        // swallow: do not break request if auth header retrieval fails
      }
    }

    outReq = this.applyCorrelation(outReq);

    return next.handle(outReq).pipe(
      catchError((err: unknown) => {
        const normalized = sanitizeError(err) as StandardError;
        if (normalized.code === ErrorCode.UNAUTHENTICATED && this.config.invalidateOn401) {
          try {
            // sinal controlado para invalidar sessão — usar API pública do AuthSessionService
                    type SessionActions = { clear?: () => void; logout?: () => void };
                    const sessionActions = this.authSession as unknown as SessionActions;
                    if (typeof sessionActions.clear === 'function') {
                      sessionActions.clear();
                    } else if (typeof sessionActions.logout === 'function') {
                      sessionActions.logout();
                    }
          } catch {
            // proteger contra efeitos colaterais
          }
        }
        return throwError(() => normalized);
      })
    );
  }

  private applyCorrelation(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const corrHeader = this.config.correlationHeaderName || DEFAULT_AUTH_INTERCEPTOR_CONFIG.correlationHeaderName;
    const headersObj = (req as unknown as { headers?: { get?: (name: string) => string | null } }).headers;
    const existing = headersObj && typeof headersObj.get === 'function' ? headersObj.get(corrHeader as string) : null;
    if (existing) return req;
    const correlation = typeof this.observability?.getCorrelationId === 'function' ? this.observability.getCorrelationId() : null;
    if (correlation) {
      return req.clone({ setHeaders: { [corrHeader as string]: correlation } });
    }
    return req;
  }
}
