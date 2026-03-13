/**
 * Base Client
 * 
 * Cliente base com lógica comum para todos os clients tipados.
 * Encapsula HttpClient, telemetria e normalização de erro.
 * 
 * Responsabilidades:
 * - Encapsular HttpClient (não expor publicamente)
 * - Aplicar normalização de erro em todas as chamadas
 * - Integrar telemetria via ObservabilityService
 * - Prover métodos auxiliares (GET, POST, PUT, DELETE)
 * - Cancelar requests automaticamente em context switch
 * - Oferecer hooks de invalidação de cache
 * 
 * Não-responsabilidades:
 * - Implementar lógica de domínio (isso é client específico)
 * - Decidir retry/cache (isso é policy/interceptor)
 */

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, takeUntil } from 'rxjs/operators';
import { mapHttpError, mapGenericError } from '../errors/error-mapper';
import { TOOL_DATA_ACCESS_CONFIG } from '../models/runtime-config.model';
import { TOOL_DATA_ACCESS_OBSERVABILITY } from '../models/observability.model';
import { CONTEXT_SERVICE_TOKEN } from '../models/context.model';

/**
 * Configuração de request com contexto
 */
export interface RequestConfig {
  /** Se true, o request requer contexto ativo e será cancelado em context switch */
  requiresContext?: boolean;
  
  /** Se true, invalida cache quando contexto mudar */
  invalidateCacheOnContextChange?: boolean;
}

/**
 * Erro lançado quando request requer contexto mas não há contexto ativo
 */
export class NoActiveContextError extends Error {
  constructor() {
    super('Request requer contexto ativo, mas nenhum contexto está selecionado');
    this.name = 'NoActiveContextError';
  }
}

export abstract class BaseClient {
  protected readonly http = inject(HttpClient);
  protected readonly config = inject(TOOL_DATA_ACCESS_CONFIG);
  protected readonly observability = inject(TOOL_DATA_ACCESS_OBSERVABILITY, { optional: true });
  protected readonly contextService = inject(CONTEXT_SERVICE_TOKEN, { optional: true });

  /**
   * Cache interno (implementação básica)
   * Subclasses podem sobrescrever para cache mais sofisticado
   */
  protected cacheMap = new Map<string, unknown>();

  constructor() {
    // Setup auto-invalidation de cache em context change
    this.setupCacheInvalidation();
  }

  /**
   * Configura invalidação automática de cache quando contexto mudar
   */
  private setupCacheInvalidation(): void {
    if (this.contextService) {
      this.contextService.contextInvalidation$().subscribe(() => {
        this.clearCache();
      });
    }
  }

  /**
   * Limpa cache (override em subclasses para cache customizado)
   */
  protected clearCache(): void {
    this.cacheMap.clear();
  }

  /**
   * Constrói URL completa a partir de path relativo
   */
  protected buildUrl(path: string): string {
    const baseUrl = this.config.baseUrl.endsWith('/')
      ? this.config.baseUrl.slice(0, -1)
      : this.config.baseUrl;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  /**
   * GET request tipado com telemetria e normalização de erro
   */
  protected get<T>(
    path: string, 
    options?: Record<string, unknown>,
    requestConfig?: RequestConfig
  ): Observable<T> {
    const url = this.buildUrl(path);
    const startTime = Date.now();

    let request$ = this.http.get<T>(url, options);

    // Auto-cancel em context switch se requiresContext = true
    if (requestConfig?.requiresContext && this.contextService) {
      const currentContext = this.contextService.snapshot();
      if (!currentContext) {
        return throwError(() => new NoActiveContextError());
      }
      
      request$ = request$.pipe(
        takeUntil(this.contextService.contextInvalidation$())
      );
    }

    return request$.pipe(
      tap(() => this.trackSuccess('GET', path, startTime)),
      catchError((error) => this.handleError(error, 'GET', path, startTime))
    );
  }

  /**
   * POST request tipado com telemetria e normalização de erro
   */
  protected post<T>(
    path: string, 
    body: unknown, 
    options?: Record<string, unknown>,
    requestConfig?: RequestConfig
  ): Observable<T> {
    const url = this.buildUrl(path);
    const startTime = Date.now();

    let request$ = this.http.post<T>(url, body, options);

    // Auto-cancel em context switch se requiresContext = true
    if (requestConfig?.requiresContext && this.contextService) {
      const currentContext = this.contextService.snapshot();
      if (!currentContext) {
        return throwError(() => new NoActiveContextError());
      }
      
      request$ = request$.pipe(
        takeUntil(this.contextService.contextInvalidation$())
      );
    }

    return request$.pipe(
      tap(() => this.trackSuccess('POST', path, startTime)),
      catchError((error) => this.handleError(error, 'POST', path, startTime))
    );
  }

  /**
   * PUT request tipado com telemetria e normalização de erro
   */
  protected put<T>(
    path: string, 
    body: unknown, 
    options?: Record<string, unknown>,
    requestConfig?: RequestConfig
  ): Observable<T> {
    const url = this.buildUrl(path);
    const startTime = Date.now();

    let request$ = this.http.put<T>(url, body, options);

    // Auto-cancel em context switch se requiresContext = true
    if (requestConfig?.requiresContext && this.contextService) {
      const currentContext = this.contextService.snapshot();
      if (!currentContext) {
        return throwError(() => new NoActiveContextError());
      }
      
      request$ = request$.pipe(
        takeUntil(this.contextService.contextInvalidation$())
      );
    }

    return request$.pipe(
      tap(() => this.trackSuccess('PUT', path, startTime)),
      catchError((error) => this.handleError(error, 'PUT', path, startTime))
    );
  }

  /**
   * DELETE request tipado com telemetria e normalização de erro
   */
  protected delete<T>(
    path: string, 
    options?: Record<string, unknown>,
    requestConfig?: RequestConfig
  ): Observable<T> {
    const url = this.buildUrl(path);
    const startTime = Date.now();

    let request$ = this.http.delete<T>(url, options);

    // Auto-cancel em context switch se requiresContext = true
    if (requestConfig?.requiresContext && this.contextService) {
      const currentContext = this.contextService.snapshot();
      if (!currentContext) {
        return throwError(() => new NoActiveContextError());
      }
      
      request$ = request$.pipe(
        takeUntil(this.contextService.contextInvalidation$())
      );
    }

    return request$.pipe(
      tap(() => this.trackSuccess('DELETE', path, startTime)),
      catchError((error) => this.handleError(error, 'DELETE', path, startTime))
    );
  }

  /**
   * Registra sucesso de chamada via telemetria
   */
  private trackSuccess(method: string, path: string, startTime: number): void {
    const latency = Date.now() - startTime;
    this.observability?.track('http.request.success', {
      method,
      path,
      latency,
    });
  }

  /**
   * Trata erro, normaliza para ToolDataError e registra telemetria
   */
  private handleError(error: unknown, method: string, path: string, startTime: number): Observable<never> {
    const latency = Date.now() - startTime;

    // Mapear para ToolDataError
    const toolError = error instanceof HttpErrorResponse
      ? mapHttpError(error)
      : mapGenericError(error);

    // Registrar telemetria de erro (sem dados sensíveis)
    this.observability?.track('http.request.error', {
      method,
      path,
      latency,
      category: toolError.category,
      code: toolError.code,
      correlationId: toolError.correlationId,
    });

    return throwError(() => toolError);
  }
}
