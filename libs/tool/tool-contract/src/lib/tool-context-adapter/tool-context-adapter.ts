/**
 * ToolContextAdapter
 * 
 * Facade que encapsula acesso ao Access Layer e expõe contexto/capabilities
 * para Tools via API reativa e minimalista.
 * 
 * Responsabilidades:
 * - Agregar Session/Context/Flags/Decision em streams unificados
 * - Expor toolContext$ e capabilities$ reativos
 * - Fornecer snapshot síncrono para bootstrap
 * - Garantir imutabilidade e minimal surface
 * - Impedir que Tools importem Access Layer diretamente
 */

import { Injectable, Optional } from '@angular/core';
import {
  Observable,
  BehaviorSubject,
  combineLatest,
  of,
  EMPTY,
} from 'rxjs';
import {
  map,
  distinctUntilChanged,
  shareReplay,
  catchError,
  tap,
} from 'rxjs/operators';

import {
  ToolContext,
  ToolRuntimeCapabilities,
  ToolContextSnapshot,
  ToolContextChange,
} from './tool-context.model';
import {
  ISessionService,
  IContextService,
  IFeatureFlagService,
  IAccessDecisionService,
} from './tool-context-adapter.service.interfaces';
import {
  mapToToolSession,
  mapToToolContext,
  mapToToolRuntimeCapabilities,
  detectChangeType,
} from './tool-context.mapper';

/**
 * Serviço Adapter contratual para Tools
 */
@Injectable({
  providedIn: 'root',
})
export class ToolContextAdapter {
  private readonly contextSubject = new BehaviorSubject<ToolContext | null>(null);
  private readonly capabilitiesSubject = new BehaviorSubject<ToolRuntimeCapabilities | null>(null);
  private readonly contextChangeSubject = new BehaviorSubject<ToolContextChange | null>(null);

  // Internal snapshots used when converting Observables to sync values
  private _flags?: string[];
  private _capabilities?: string[];

  /**
   * Stream reativo do contexto da Tool
   * Emite quando sessão ou contexto mudam
   */
  readonly toolContext$: Observable<ToolContext | null> = this.contextSubject.asObservable().pipe(
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /**
   * Stream reativo de capabilities
   * Emite quando flags ou decisões mudam
   */
  readonly capabilities$: Observable<ToolRuntimeCapabilities | null> = this.capabilitiesSubject.asObservable().pipe(
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  /**
   * Stream de mudanças de contexto (com previous/current)
   */
  readonly contextChange$: Observable<ToolContextChange | null> = this.contextChangeSubject.asObservable();

  constructor(
    @Optional() private readonly sessionService?: ISessionService,
    @Optional() private readonly contextService?: IContextService,
    @Optional() private readonly featureFlagService?: IFeatureFlagService,
    @Optional() private readonly accessDecisionService?: IAccessDecisionService
  ) {
    this.initialize();
  }

  /**
   * Inicializa streams reativos
   */
  private initialize(): void {
    // Se não há serviços injetados, modo degradado (dados mockados mínimos)
    if (!this.sessionService || !this.contextService) {
      console.warn('[ToolContextAdapter] Serviços não injetados - modo degradado');
      this.initializeFallback();
      return;
    }

    // Combina session$ e context$ para criar toolContext$
    combineLatest([
      this.sessionService.session$ || of(this.sessionService.getCurrentSession()),
      this.contextService.contextChange$,
    ])
      .pipe(
        map(([session, appContext]) => {
          const toolSession = mapToToolSession(session);
          if (!toolSession || !appContext) {
            return null;
          }
          return mapToToolContext(appContext, toolSession);
        }),
        tap((newContext) => {
          if (newContext) {
            const previous = this.contextSubject.value;
            const changeType = detectChangeType(previous, newContext);
            this.contextChangeSubject.next({
              previous,
              current: newContext,
              changeType,
              timestamp: Date.now(),
            });
          }
        }),
        catchError((err) => {
          console.error('[ToolContextAdapter] Erro ao processar contexto:', err);
          return EMPTY;
        })
      )
      .subscribe((context) => {
        this.contextSubject.next(context);
      });

    // Atualiza capabilities quando flags ou contexto mudam
    this.updateCapabilities();
  }

  /**
   * Modo degradado: inicializa com dados mockados mínimos
   */
  private initializeFallback(): void {
    const fallbackContext: ToolContext = {
      session: {
        userId: 'fallback-user',
        userName: 'Usuário Fallback',
        userEmail: 'fallback@example.com',
        roles: ['user'],
        expiresAt: Date.now() + 3600000,
      },
      tenantId: 'fallback-tenant',
      tenantName: 'Tenant Fallback',
      clientId: null,
      clientName: null,
      projectId: null,
      projectName: null,
      environment: 'dev',
      updatedAt: Date.now(),
    };

    this.contextSubject.next(fallbackContext);

    const fallbackCapabilities: ToolRuntimeCapabilities = {
      enabledFeatures: [],
      allowedActions: [],
      isToolEnabled: true,
      disabledReason: undefined,
    };

    this.capabilitiesSubject.next(fallbackCapabilities);
  }

  /**
   * Atualiza capabilities baseado em flags e decisões
   */
  private updateCapabilities(toolKey?: string): void {
    if (!this.featureFlagService || !this.accessDecisionService) {
      return;
    }

    const enabledFeatures = this.getEnabledFeatures();
    const allowedActions = this.getAllowedActions();
    const isToolEnabled = toolKey && this.featureFlagService?.isToolEnabled
      ? this.featureFlagService.isToolEnabled(toolKey)
      : true;

    const capabilities = mapToToolRuntimeCapabilities(
      enabledFeatures,
      allowedActions,
      isToolEnabled
    );

    this.capabilitiesSubject.next(capabilities);
  }

  /**
   * Obtém features habilitadas
   */
  private getEnabledFeatures(): string[] {
    if (!this.featureFlagService?.getActiveFlags) {
      return this._flags ?? [];
    }

    const flags = this.featureFlagService.getActiveFlags();
    const maybeFlags = flags as unknown as { subscribe?: (next: (v: unknown) => void) => void };

    if (maybeFlags && typeof maybeFlags.subscribe === 'function') {
      maybeFlags.subscribe((f: unknown) => {
        if (Array.isArray(f)) {
          this._flags = [...f];
        }
      });
      return this._flags ?? [];
    }

    if (Array.isArray(flags)) {
      this._flags = [...flags];
      return this._flags;
    }

    return this._flags ?? [];
  }

  /**
   * Obtém ações permitidas
   */
  private getAllowedActions(): string[] {
    if (!this.accessDecisionService) {
      return this._capabilities ?? [];
    }

    const capabilities = this.accessDecisionService.getUserCapabilities();
    const maybeCapabilities = capabilities as unknown as { subscribe?: (next: (v: unknown) => void) => void };

    if (maybeCapabilities && typeof maybeCapabilities.subscribe === 'function') {
      maybeCapabilities.subscribe((c: unknown) => {
        if (Array.isArray(c)) {
          this._capabilities = [...c];
        }
      });
      return this._capabilities ?? [];
    }

    if (Array.isArray(capabilities)) {
      this._capabilities = [...capabilities];
      return this._capabilities;
    }

    return this._capabilities ?? [];
  }

  /**
   * Retorna snapshot síncrono do contexto (para bootstrap)
   */
  contextSnapshot(toolKey?: string): ToolContextSnapshot | null {
    const context = this.contextSubject.value;
    
    // Atualiza capabilities para a tool específica se fornecida
    if (toolKey) {
      this.updateCapabilities(toolKey);
    }
    
    const capabilities = this.capabilitiesSubject.value;

    if (!context || !capabilities) {
      return null;
    }

    return {
      context,
      capabilities,
    };
  }

  /**
   * Força refresh de capabilities (útil para testes ou context switches)
   */
  refreshCapabilities(toolKey?: string): void {
    this.updateCapabilities(toolKey);
  }
}
