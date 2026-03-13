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
import { Observable } from 'rxjs';
import { ToolContext, ToolRuntimeCapabilities, ToolContextSnapshot, ToolContextChange } from './tool-context.model';
import { ISessionService, IContextService, IFeatureFlagService, IAccessDecisionService } from './tool-context-adapter.service.interfaces';
/**
 * Serviço Adapter contratual para Tools
 */
export declare class ToolContextAdapter {
    private readonly sessionService?;
    private readonly contextService?;
    private readonly featureFlagService?;
    private readonly accessDecisionService?;
    private readonly contextSubject;
    private readonly capabilitiesSubject;
    private readonly contextChangeSubject;
    private _flags?;
    private _capabilities?;
    /**
     * Stream reativo do contexto da Tool
     * Emite quando sessão ou contexto mudam
     */
    readonly toolContext$: Observable<ToolContext | null>;
    /**
     * Stream reativo de capabilities
     * Emite quando flags ou decisões mudam
     */
    readonly capabilities$: Observable<ToolRuntimeCapabilities | null>;
    /**
     * Stream de mudanças de contexto (com previous/current)
     */
    readonly contextChange$: Observable<ToolContextChange | null>;
    constructor(sessionService?: ISessionService | undefined, contextService?: IContextService | undefined, featureFlagService?: IFeatureFlagService | undefined, accessDecisionService?: IAccessDecisionService | undefined);
    /**
     * Inicializa streams reativos
     */
    private initialize;
    /**
     * Modo degradado: inicializa com dados mockados mínimos
     */
    private initializeFallback;
    /**
     * Atualiza capabilities baseado em flags e decisões
     */
    private updateCapabilities;
    /**
     * Obtém features habilitadas
     */
    private getEnabledFeatures;
    /**
     * Obtém ações permitidas
     */
    private getAllowedActions;
    /**
     * Retorna snapshot síncrono do contexto (para bootstrap)
     */
    contextSnapshot(toolKey?: string): ToolContextSnapshot | null;
    /**
     * Força refresh de capabilities (útil para testes ou context switches)
     */
    refreshCapabilities(toolKey?: string): void;
}
//# sourceMappingURL=tool-context-adapter.d.ts.map