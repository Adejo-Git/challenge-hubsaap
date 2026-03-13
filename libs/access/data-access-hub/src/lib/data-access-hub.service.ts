import { Injectable, Inject, Optional, DestroyRef } from '@angular/core';
import { Observable, of, throwError, Subscription } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { DataAccessHubState } from './data-access-hub.state';
import { CatalogItem } from './data-access-hub.model';
import { HubClient } from '@hub/api-clients-sdk';
import { StandardError } from '@hub/error-model';
import {
  CONTEXT_SERVICE_TOKEN,
  ContextServicePort,
  ObservabilityService,
  TOOL_DATA_ACCESS_OBSERVABILITY,
} from '@hub/tool-data-access-sdk';

@Injectable({ providedIn: 'root' })
export class DataAccessHubService {
  private state = new DataAccessHubState();

  private contextService?: ContextServicePort;
  private _ctxSub?: Subscription;

  constructor(
    protected hubClient: HubClient,
    @Optional() @Inject(TOOL_DATA_ACCESS_OBSERVABILITY) protected observability?: ObservabilityService | null,
    @Optional() @Inject(CONTEXT_SERVICE_TOKEN) contextService?: ContextServicePort,
    @Optional() protected destroyRef?: DestroyRef
  ) {
    this.contextService = contextService;
    // subscribe to context invalidation to clear cache and reload
    if (this.contextService?.contextInvalidation$) {
      this._ctxSub = this.contextService
        .contextInvalidation$()
        .pipe(
          switchMap(() => {
            this.invalidateCatalog();
            // return loadCatalog and swallow error inside pipe (so inner subscribe avoided)
            return this.loadCatalog().pipe(catchError(() => of(null)));
          })
        )
        .subscribe({ next: () => undefined, error: () => undefined });

      // ensure unsubscribe if injector destroys this service (optional)
      this.destroyRef?.onDestroy(() => this._ctxSub?.unsubscribe());
    }
  }

  catalog$(): Observable<CatalogItem[] | null> {
    return this.state.catalog$;
  }

  getCachedCatalog(): CatalogItem[] | null {
    return this.state.getCachedCatalog();
  }

  loadCatalog(force = false): Observable<CatalogItem[]> {
    const cached = this.state.getCachedCatalog();
    if (cached && !force) {
      return of(cached);
    }

    // Delegar para o client tipado
    return this.hubClient.listProjects().pipe(
      tap((items: unknown[]) => {
        // map to CatalogItem shape if necessary
        const arr = items as Array<Record<string, unknown>>;
        const mapped: CatalogItem[] = arr.map((i) => ({ id: String(i.id), name: String(i.name), description: typeof i.description === 'string' ? i.description : undefined }));
        this.state.setCatalog(mapped);
        try {
          this.observability?.track?.('data-access-hub.loadCatalog.success', { count: mapped.length });
        } catch {
          // swallow observability errors
        }
      }),
      catchError((err: unknown) => {
        // normalize to StandardError and rethrow
        const se = this.normalizeError(err);
        try {
          this.observability?.trackError?.(se, { source: 'data-access-hub.loadCatalog' });
        } catch {
          // noop
        }
        return throwError(() => se);
      })
    );
  }

  invalidateCatalog() {
    this.state.invalidateCatalog();
  }

  setCacheTtl(ms: number) {
    this.state.setTtl(ms);
  }

  // Exemplos de métodos adicionais
  saveDraft(_draft: Partial<CatalogItem>): Observable<CatalogItem> {
    void _draft;
    // Exemplo: delegar para hubClient.post if exists; implement as not implemented placeholder
    return throwError(() => ({ category: 'UNKNOWN' as unknown as StandardError['category'], code: 'NOT_IMPLEMENTED', userMessage: 'saveDraft not implemented' } as StandardError));
  }

  private normalizeError(err: unknown): StandardError {
    if (!err) {
      return {
        category: 'UNKNOWN' as unknown as StandardError['category'],
        code: 'UNKNOWN_ERROR',
        severity: 'error' as unknown as StandardError['severity'],
        userMessage: 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
    // If it's already a StandardError-like object, return as-is
    const maybe = err as StandardError;
    if (maybe && maybe.code && maybe.userMessage) return maybe;

    const userMessage = typeof err === 'string' ? err : err instanceof Error ? err.message : JSON.stringify(err);
    return {
      category: 'UNKNOWN' as unknown as StandardError['category'],
      code: 'UNKNOWN_ERROR',
      severity: 'error' as unknown as StandardError['severity'],
      userMessage,
      timestamp: new Date().toISOString(),
    };
  }
}
