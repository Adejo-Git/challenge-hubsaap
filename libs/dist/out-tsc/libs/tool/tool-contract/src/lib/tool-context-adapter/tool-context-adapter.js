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
import { __decorate, __metadata, __param } from "tslib";
import { Injectable, Optional } from '@angular/core';
import { BehaviorSubject, combineLatest, of, EMPTY, } from 'rxjs';
import { map, distinctUntilChanged, shareReplay, catchError, tap, } from 'rxjs/operators';
import { mapToToolSession, mapToToolContext, mapToToolRuntimeCapabilities, detectChangeType, } from './tool-context.mapper';
/**
 * Serviço Adapter contratual para Tools
 */
let ToolContextAdapter = class ToolContextAdapter {
    sessionService;
    contextService;
    featureFlagService;
    accessDecisionService;
    contextSubject = new BehaviorSubject(null);
    capabilitiesSubject = new BehaviorSubject(null);
    contextChangeSubject = new BehaviorSubject(null);
    // Internal snapshots used when converting Observables to sync values
    _flags;
    _capabilities;
    /**
     * Stream reativo do contexto da Tool
     * Emite quando sessão ou contexto mudam
     */
    toolContext$ = this.contextSubject.asObservable().pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), shareReplay({ bufferSize: 1, refCount: true }));
    /**
     * Stream reativo de capabilities
     * Emite quando flags ou decisões mudam
     */
    capabilities$ = this.capabilitiesSubject.asObservable().pipe(distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)), shareReplay({ bufferSize: 1, refCount: true }));
    /**
     * Stream de mudanças de contexto (com previous/current)
     */
    contextChange$ = this.contextChangeSubject.asObservable();
    constructor(sessionService, contextService, featureFlagService, accessDecisionService) {
        this.sessionService = sessionService;
        this.contextService = contextService;
        this.featureFlagService = featureFlagService;
        this.accessDecisionService = accessDecisionService;
        this.initialize();
    }
    /**
     * Inicializa streams reativos
     */
    initialize() {
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
            .pipe(map(([session, appContext]) => {
            const toolSession = mapToToolSession(session);
            if (!toolSession || !appContext) {
                return null;
            }
            return mapToToolContext(appContext, toolSession);
        }), tap((newContext) => {
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
        }), catchError((err) => {
            console.error('[ToolContextAdapter] Erro ao processar contexto:', err);
            return EMPTY;
        }))
            .subscribe((context) => {
            this.contextSubject.next(context);
        });
        // Atualiza capabilities quando flags ou contexto mudam
        this.updateCapabilities();
    }
    /**
     * Modo degradado: inicializa com dados mockados mínimos
     */
    initializeFallback() {
        const fallbackContext = {
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
        const fallbackCapabilities = {
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
    updateCapabilities(toolKey) {
        if (!this.featureFlagService || !this.accessDecisionService) {
            return;
        }
        const enabledFeatures = this.getEnabledFeatures();
        const allowedActions = this.getAllowedActions();
        const isToolEnabled = toolKey && this.featureFlagService?.isToolEnabled
            ? this.featureFlagService.isToolEnabled(toolKey)
            : true;
        const capabilities = mapToToolRuntimeCapabilities(enabledFeatures, allowedActions, isToolEnabled);
        this.capabilitiesSubject.next(capabilities);
    }
    /**
     * Obtém features habilitadas
     */
    getEnabledFeatures() {
        if (!this.featureFlagService?.getActiveFlags) {
            return this._flags ?? [];
        }
        const flags = this.featureFlagService.getActiveFlags();
        const maybeFlags = flags;
        if (maybeFlags && typeof maybeFlags.subscribe === 'function') {
            maybeFlags.subscribe((f) => {
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
    getAllowedActions() {
        if (!this.accessDecisionService) {
            return this._capabilities ?? [];
        }
        const capabilities = this.accessDecisionService.getUserCapabilities();
        const maybeCapabilities = capabilities;
        if (maybeCapabilities && typeof maybeCapabilities.subscribe === 'function') {
            maybeCapabilities.subscribe((c) => {
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
    contextSnapshot(toolKey) {
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
    refreshCapabilities(toolKey) {
        this.updateCapabilities(toolKey);
    }
};
ToolContextAdapter = __decorate([
    Injectable({
        providedIn: 'root',
    }),
    __param(0, Optional()),
    __param(1, Optional()),
    __param(2, Optional()),
    __param(3, Optional()),
    __metadata("design:paramtypes", [Object, Object, Object, Object])
], ToolContextAdapter);
export { ToolContextAdapter };
//# sourceMappingURL=tool-context-adapter.js.map