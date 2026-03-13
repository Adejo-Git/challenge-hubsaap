/**
 * Interfaces abstratas dos serviços do Access Layer
 *
 * O ToolContextAdapter depende dessas interfaces, não das implementações concretas.
 * Isso permite:
 * - Testar com mocks facilmente
 * - Evitar acoplamento com implementações específicas
 * - Implementar os serviços reais posteriormente sem quebrar o adapter
 */
import { Observable } from 'rxjs';
/**
 * Interface abstrata do SessionService (Access Layer)
 */
export interface ISessionService {
    /** Retorna a sessão ativa atual (snapshot síncrono) */
    getCurrentSession(): ISession | null;
    /** Stream reativo da sessão (emite quando sessão muda) */
    session$?: Observable<ISession | null>;
    /** Verifica se há sessão autenticada */
    isAuthenticated(): boolean;
}
/**
 * Modelo de sessão esperado do Access Layer
 */
export interface ISession {
    user: {
        id: string;
        name: string;
        email: string;
        roles: string[];
    };
    token: string;
    expiresAt: Date;
}
/**
 * Interface abstrata do ContextService (Access Layer)
 */
export interface IContextService {
    /** Retorna o contexto ativo atual (snapshot síncrono) */
    getActiveContext(): IAppContext | null;
    /** Stream reativo do contexto (emite quando contexto muda) */
    contextChange$: Observable<IAppContext>;
}
/**
 * Modelo de contexto esperado do Access Layer
 */
export interface IAppContext {
    tenantId: string;
    tenantName: string;
    clienteId: string | null;
    clienteName: string | null;
    projetoId: string | null;
    projetoName: string | null;
    environment: 'dev' | 'staging' | 'production';
}
/**
 * Interface abstrata do FeatureFlagService (Access Layer)
 * Alinhada com a API real do FeatureFlagService: isEnabled/watch/snapshot/tool
 */
export interface IFeatureFlagService {
    /** Verifica se a flag está habilitada (síncrono). Formato: "namespace.featureName" */
    isEnabled(key: string): boolean;
    /** Observable que emite sempre que o valor da flag muda */
    watch(key: string): Observable<boolean>;
    /** Retorna snapshot seguro das flags efetivas */
    snapshot(): IFlagSnapshot;
    /** Helper de ergonomia para flags de tool específica */
    tool(toolKey: string): IToolFlagHelper;
    /** @deprecated Use isEnabled() com formato "toolKey.featureName" */
    isToolEnabled?(toolKey: string): boolean;
    /** @deprecated Use isEnabled() com formato "namespace.featureName" */
    isFeatureEnabled?(featureKey: string): boolean;
    /** @deprecated Use snapshot() para obter estado atual das flags */
    getActiveFlags?(): Observable<string[]> | string[];
}
/**
 * Helper de flags para uma tool específica
 */
export interface IToolFlagHelper {
    isEnabled(featureKey: string): boolean;
    watch(featureKey: string): Observable<boolean>;
}
/**
 * Snapshot seguro de flags
 */
export interface IFlagSnapshot {
    flags: Readonly<Record<string, {
        enabled: boolean;
    }>>;
    version: number;
    timestamp: number;
}
/**
 * Interface abstrata do AccessDecisionService (Access Layer)
 */
export interface IAccessDecisionService {
    /** Verifica se usuário pode acessar uma tool */
    canAccessTool(toolKey: string): boolean;
    /** Retorna capabilities do usuário atual */
    getUserCapabilities(): Observable<string[]> | string[];
    /** Avalia acesso e retorna decisão detalhada */
    evaluateAccess?(toolKey: string): IAccessDecision;
}
/**
 * Decisão de acesso detalhada
 */
export interface IAccessDecision {
    allowed: boolean;
    reason?: string;
    fallbackUrl?: string;
}
//# sourceMappingURL=tool-context-adapter.service.interfaces.d.ts.map