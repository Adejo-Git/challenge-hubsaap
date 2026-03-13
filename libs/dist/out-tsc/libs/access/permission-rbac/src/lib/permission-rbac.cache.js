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
import { simpleCacheKey } from './permission-rbac.util';
/**
 * Cache simples de Grants por chave composta (sessionId + contextKey).
 */
export class PermissionRbacCache {
    cache = new Map();
    /**
     * Obter grants do cache.
     *
     * @param sessionId Identificador de sessão
     * @param contextKey Identificador de contexto (opcional)
     * @returns Grants se encontrado, undefined caso contrário
     */
    get(sessionId, contextKey) {
        const key = this.buildKey(sessionId, contextKey);
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        // TODO (futuro): checar expiração por timestamp se necessário
        return entry.grants;
    }
    /**
     * Armazenar grants no cache.
     *
     * @param sessionId Identificador de sessão
     * @param grants Grants a armazenar
     * @param contextKey Identificador de contexto (opcional)
     */
    set(sessionId, grants, contextKey) {
        const key = this.buildKey(sessionId, contextKey);
        this.cache.set(key, {
            grants,
            timestamp: Date.now(),
            sessionId,
            contextKey,
        });
    }
    /**
     * Limpar todo o cache.
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Limpar entradas de cache de uma sessão específica.
     *
     * @param sessionId Identificador de sessão a invalidar
     */
    clearBySession(sessionId) {
        const keysToDelete = [];
        this.cache.forEach((entry, key) => {
            if (entry.sessionId === sessionId) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach((key) => this.cache.delete(key));
    }
    /**
     * Limpar entradas de cache de um contexto específico.
     *
     * @param contextKey Identificador de contexto a invalidar
     */
    clearByContext(contextKey) {
        const keysToDelete = [];
        this.cache.forEach((entry, key) => {
            if (entry.contextKey === contextKey) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach((key) => this.cache.delete(key));
    }
    /**
     * Limpar entradas de cache de uma sessão + contexto específicos.
     *
     * @param sessionId Identificador de sessão
     * @param contextKey Identificador de contexto
     */
    clearBySessionAndContext(sessionId, contextKey) {
        const key = this.buildKey(sessionId, contextKey);
        this.cache.delete(key);
    }
    /**
     * Obter o tamanho atual do cache (número de entradas).
     *
     * @returns Número de entradas
     */
    size() {
        return this.cache.size;
    }
    /**
     * Verificar se existe entrada para sessionId + contextKey.
     *
     * @param sessionId Identificador de sessão
     * @param contextKey Identificador de contexto (opcional)
     * @returns true se existe, false caso contrário
     */
    has(sessionId, contextKey) {
        const key = this.buildKey(sessionId, contextKey);
        return this.cache.has(key);
    }
    /**
     * Construir chave de cache composta (sessionId + contextKey).
     *
     * @param sessionId Identificador de sessão
     * @param contextKey Identificador de contexto (opcional)
     * @returns Chave única para indexação
     */
    buildKey(sessionId, contextKey) {
        return simpleCacheKey(sessionId, contextKey || '');
    }
}
/**
 * Instância singleton do cache (injetável via DI no service).
 * NOTE: Em produção, deve ser fornecido via DI (providedIn: 'root' no service).
 */
export const defaultRbacCache = new PermissionRbacCache();
//# sourceMappingURL=permission-rbac.cache.js.map