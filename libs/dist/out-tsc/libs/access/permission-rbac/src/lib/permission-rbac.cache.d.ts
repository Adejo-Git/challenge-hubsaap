/**
 * @file permission-rbac.cache.ts
 * @description Cache de grants efetivos por sessão+contexto.
 *
 * GUARDRAILS:
 * - Cache em memória (runtime), não persiste em storage
 * - Sem HttpClient
 * - Indexação por chaves seguras (sessionId + contextKey)
 * - API simples: get/set/clear/clearBySession
 *
 * Responsabilidades:
 * - Armazenar Grants resolvidos para evitar recomputação
 * - Invalidar cache em troca de sessão ou contexto
 * - Proteger contra vazamento de dados sensíveis (não armazena claims completas)
 */
import { Grants } from './permission-rbac.model';
/**
 * Cache simples de Grants por chave composta (sessionId + contextKey).
 */
export declare class PermissionRbacCache {
    private cache;
    /**
     * Obter grants do cache.
     *
     * @param sessionId Identificador de sessão
     * @param contextKey Identificador de contexto (opcional)
     * @returns Grants se encontrado, undefined caso contrário
     */
    get(sessionId: string, contextKey?: string): Grants | undefined;
    /**
     * Armazenar grants no cache.
     *
     * @param sessionId Identificador de sessão
     * @param grants Grants a armazenar
     * @param contextKey Identificador de contexto (opcional)
     */
    set(sessionId: string, grants: Grants, contextKey?: string): void;
    /**
     * Limpar todo o cache.
     */
    clear(): void;
    /**
     * Limpar entradas de cache de uma sessão específica.
     *
     * @param sessionId Identificador de sessão a invalidar
     */
    clearBySession(sessionId: string): void;
    /**
     * Limpar entradas de cache de um contexto específico.
     *
     * @param contextKey Identificador de contexto a invalidar
     */
    clearByContext(contextKey: string): void;
    /**
     * Limpar entradas de cache de uma sessão + contexto específicos.
     *
     * @param sessionId Identificador de sessão
     * @param contextKey Identificador de contexto
     */
    clearBySessionAndContext(sessionId: string, contextKey: string): void;
    /**
     * Obter o tamanho atual do cache (número de entradas).
     *
     * @returns Número de entradas
     */
    size(): number;
    /**
     * Verificar se existe entrada para sessionId + contextKey.
     *
     * @param sessionId Identificador de sessão
     * @param contextKey Identificador de contexto (opcional)
     * @returns true se existe, false caso contrário
     */
    has(sessionId: string, contextKey?: string): boolean;
    /**
     * Construir chave de cache composta (sessionId + contextKey).
     *
     * @param sessionId Identificador de sessão
     * @param contextKey Identificador de contexto (opcional)
     * @returns Chave única para indexação
     */
    private buildKey;
}
/**
 * Instância singleton do cache (injetável via DI no service).
 * NOTE: Em produção, deve ser fornecido via DI (providedIn: 'root' no service).
 */
export declare const defaultRbacCache: PermissionRbacCache;
//# sourceMappingURL=permission-rbac.cache.d.ts.map