import { Injectable, Inject, Optional } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HTTP_BASE_CONFIG, HttpBaseConfig } from '../http-base.config';
import { shouldIntercept, buildContextHeaders } from '../http-base.util';
import { CONTEXT_SNAPSHOT, ContextSnapshot } from '../http-base.module';

@Injectable()
export class ContextHeadersInterceptor implements HttpInterceptor {
  constructor(
    @Inject(HTTP_BASE_CONFIG) private config: HttpBaseConfig,
    @Optional() @Inject(CONTEXT_SNAPSHOT) private snapshot?: ContextSnapshot
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const url = req.urlWithParams || req.url;
    if (!shouldIntercept(url, this.config)) {
      return next.handle(req);
    }

    const ctx = buildContextHeaders(this.snapshot);
    if (!ctx || Object.keys(ctx).length === 0) {
      return next.handle(req);
    }

    const cloned = req.clone({ setHeaders: ctx });
    return next.handle(cloned);
  }
}
