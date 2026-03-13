/**
 * @file permission-rbac.service.ts
 * @description Service principal de RBAC: hasRole, hasPermission, resolveGrants, explain.
 *
 * GUARDRAILS:
 * - Não decide acesso final (isso é access-decision)
 * - Não integra com Router/guards diretamente
 * - Sem HttpClient
 * - Não interpreta ABAC/policies
 *
 * Responsabilidades:
 * - Resolver grants efetivos usando ClaimsLite + estratégia configurada
 * - Expor hasRole/hasPermission (singular e múltiplo)
 * - Cache de grants por sessão+contexto
 * - explain() sem dados sensíveis
 */
import { Observable } from 'rxjs';
import { ClaimsLite, RbacConfig, PermissionKey, RoleKey, Grants, ExplainResult, CheckOptions } from './permission-rbac.model';
import { PermissionMap } from './permission-map';
import { PermissionRbacCache } from './permission-rbac.cache';
/**
 * Token de injeção para fornecer adaptador reativo de sessão (auth-session).
 * Uso opcional: se fornecido, sincroniza claims automaticamente.
 */
export declare const AUTH_SESSION_ADAPTER_TOKEN: unique symbol;
/**
 * Contrato para adaptador reativo de sessão.
 * Implementação esperada: wrapper de AuthSessionService.session$.
 */
export interface AuthSessionAdapter {
    session$(): Observable<{
        claims: ClaimsLite | null;
    }>;
}
/**
 * Service de RBAC (Role-Based Access Control).
 *
 * Uso:
 * ```typescript
 * constructor(private rbac: PermissionRbacService) {}
 *
 * // Checar role
 * if (this.rbac.hasRole('ADMIN')) { ... }
 *
 * // Checar permission
 * if (this.rbac.hasPermission('tool.pip.write')) { ... }
 *
 * // Explain decisão
 * const result = this.rbac.explain('tool.nonexistent.action');
 * console.log(result.code, result.message);
 * ```
 */
export declare class PermissionRbacService {
    private config;
    private cache;
    private currentClaims;
    private currentContextKey;
    private permissionMap;
    private sessionSubscription;
    constructor(providedConfig?: RbacConfig, providedCache?: PermissionRbacCache, providedMap?: PermissionMap, authSessionAdapter?: AuthSessionAdapter);
    /**
     * Sincronizar automaticamente com AuthSessionService via Observable.
     * Reduz wiring manual: setSession é chamado cada vez que session$ muda.
     *
     * @param adapter Implementação de AuthSessionAdapter
     */
    private subscribeToAuthSession;
    /**
     * Destruir: limpar subscription e sessão.
     * Deve ser chamado em ngOnDestroy se o adaptador for fornecido.
     */
    ngOnDestroy(): void;
    /**
     * Configurar sessão/claims atuais.
     * Deve ser chamado ao inicializar/trocar sessão.
     *
     * @param claims ClaimsLite da sessão
     */
    setSession(claims: ClaimsLite): void;
    /**
     * Configurar contexto atual (tenant/project/etc.).
     * Deve ser chamado ao trocar contexto.
     *
     * @param contextKey Identificador do contexto
     */
    setContext(contextKey: string): void;
    /**
     * Limpar sessão e cache.
     */
    clearSession(): void;
    /**
     * Configurar PermissionMap (para estratégia map-based).
     *
     * @param map PermissionMap
     */
    setPermissionMap(map: PermissionMap): void;
    /**
     * Checar se o usuário possui um ou mais roles.
     *
     * @param roles RoleKey ou array de RoleKeys
     * @param options Opções de checagem (behavior: any|all)
     * @returns true se possui, false caso contrário
     */
    hasRole(roles: RoleKey | RoleKey[], options?: CheckOptions): boolean;
    /**
     * Checar se o usuário possui uma ou mais permissões.
     *
     * @param permissions PermissionKey ou array de PermissionKeys
     * @param options Opções de checagem (behavior: any|all)
     * @returns true se possui, false caso contrário
     */
    hasPermission(permissions: PermissionKey | PermissionKey[], options?: CheckOptions): boolean;
    /**
     * Resolver grants efetivos do usuário atual (com cache).
     *
     * @returns Set de PermissionKeys concedidas
     */
    resolveGrants(): Grants;
    /**
     * Explicar decisão de allow/deny para uma permissão.
     *
     * @param permission PermissionKey a explicar
     * @returns ExplainResult com código e mensagem técnica (sem dados sensíveis)
     */
    explain(permission: PermissionKey): ExplainResult;
    /**
     * Explicar decisão de allow/deny para um role.
     *
     * @param role RoleKey a explicar
     * @returns ExplainResult com código e mensagem técnica (sem dados sensíveis)
     */
    explainRole(role: RoleKey): ExplainResult;
    /**
     * Resolver grants baseado na estratégia configurada.
     *
     * @returns Grants efetivos
     */
    private resolveGrantsByStrategy;
    /**
     * Estratégia claims-only: permissões já vêm no token.
     *
     * @returns Grants diretos de ClaimsLite
     */
    private resolveGrantsClaimsOnly;
    /**
     * Estratégia map-based: permissões derivadas de roles via PermissionMap.
     *
     * @returns Grants derivados do mapa
     */
    private resolveGrantsMapBased;
    /**
     * Estratégia hybrid: combina claims diretas + mapa.
     *
     * @returns Grants mesclados (claims + map)
     */
    private resolveGrantsHybrid;
}
//# sourceMappingURL=permission-rbac.service.d.ts.map