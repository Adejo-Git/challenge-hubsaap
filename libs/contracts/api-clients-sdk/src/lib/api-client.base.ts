import { HttpClient, HttpParams } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { StandardError, fromHttpError } from '@hub/error-model';

import { RuntimeConfig, RUNTIME_CONFIG } from './runtime-config.token';

@Injectable()
export class ApiClientBase {
  protected baseUrl: string;

  constructor(protected http: HttpClient, @Inject(RUNTIME_CONFIG) protected config: RuntimeConfig) {
    this.baseUrl = config?.baseUrl || '';
  }

  protected buildUrl(path: string): string {
    const version = this.config?.apiVersion ? `/${this.config.apiVersion}` : '';
    return `${this.baseUrl}${version}${path}`;
  }

  protected get<T>(path: string, params?: Record<string, string | number>): Observable<T> {
    const httpParams = this.toHttpParams(params);
    return this.http.get<T>(this.buildUrl(path), { params: httpParams }).pipe(
      map((r) => r as T),
      catchError((err) => throwError(() => this.toStandardError(err)))
    );
  }

  protected post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.buildUrl(path), body).pipe(
      map((r) => r as T),
      catchError((err) => throwError(() => this.toStandardError(err)))
    );
  }

  protected put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.buildUrl(path), body).pipe(
      map((r) => r as T),
      catchError((err) => throwError(() => this.toStandardError(err)))
    );
  }

  protected delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path)).pipe(
      map((r) => r as T),
      catchError((err) => throwError(() => this.toStandardError(err)))
    );
  }

  private toHttpParams(params?: Record<string, string | number>): HttpParams | undefined {
    if (!params) return undefined;
    let p = new HttpParams();
    Object.keys(params).forEach((k) => {
      p = p.set(k, String(params[k]));
    });
    return p;
  }

  private toStandardError(err: unknown): StandardError {
    // Reuse shared mapper to ensure consistency across the monorepo
    const e = err as Record<string, unknown>;
    const httpLike = {
      status: (e?.status as number) ?? 0,
      error: (e?.error as unknown) ?? (e?.message as unknown) ?? null,
      message: e?.message as unknown,
      url: e?.url as unknown,
    };
    return fromHttpError(httpLike as unknown);
  }
}
