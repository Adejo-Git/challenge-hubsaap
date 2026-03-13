/**
 * @file permission-rbac.util.ts
 * @description Funções utilitárias de normalização e validação para RBAC.
 *
 * GUARDRAILS:
 * - Sem HttpClient
 * - Sem acesso direto a storage de sessão
 * - Sem regras ABAC/policy
 * - Sem lógica de navegação/menu
 *
 * Responsabilidades:
 * - Normalizar arrays/strings de roles e permissions vindas de claims
 * - Validar formato de PermissionKey/RoleKey
 * - Dedupe e sanitização básica (trim, lowercase para permissions)
 * - Helpers seguros (sem vazar dados sensíveis)
 */
/**
 * Normaliza uma lista de permission keys:
 * - Remove whitespace
 * - Converte para lowercase
 * - Remove duplicatas
 * - Remove valores vazios
 *
 * @param permissions Array ou string única de permissions
 * @returns Array normalizado e dedupado
 */
export function normalizePermissions(permissions) {
    if (!permissions) {
        return [];
    }
    const array = Array.isArray(permissions) ? permissions : [permissions];
    return Array.from(new Set(array
        .map((p) => (p || '').trim().toLowerCase())
        .filter((p) => p.length > 0)));
}
/**
 * Normaliza uma lista de role keys:
 * - Remove whitespace
 * - Preserva case original (roles são case-sensitive por padrão, mas comparação pode ser case-insensitive)
 * - Remove duplicatas
 * - Remove valores vazios
 *
 * @param roles Array ou string única de roles
 * @returns Array normalizado e dedupado
 */
export function normalizeRoles(roles) {
    if (!roles) {
        return [];
    }
    const array = Array.isArray(roles) ? roles : [roles];
    return Array.from(new Set(array
        .map((r) => (r || '').trim())
        .filter((r) => r.length > 0)));
}
/**
 * Valida formato básico de PermissionKey.
 *
 * Regra padrão:
 * - Não-vazia
 * - Somente caracteres: a-z, 0-9, ponto (.), hífen (-), underscore (_)
 * - Comprimento: 3-100 caracteres
 * - Formato recomendado: "scope.resource.action"
 *
 * @param key PermissionKey a validar
 * @returns true se válida, false caso contrário
 */
export function isValidPermissionKey(key) {
    if (!key || typeof key !== 'string') {
        return false;
    }
    const trimmed = key.trim().toLowerCase();
    // Comprimento mínimo e máximo
    if (trimmed.length < 3 || trimmed.length > 100) {
        return false;
    }
    // Regex: somente lowercase, números, ponto, hífen, underscore
    const regex = /^[a-z0-9._-]+$/;
    return regex.test(trimmed);
}
/**
 * Valida formato básico de RoleKey.
 *
 * Regra padrão:
 * - Não-vazia
 * - Somente caracteres: A-Z, a-z, 0-9, underscore (_), hífen (-)
 * - Comprimento: 2-50 caracteres
 *
 * @param key RoleKey a validar
 * @returns true se válida, false caso contrário
 */
export function isValidRoleKey(key) {
    if (!key || typeof key !== 'string') {
        return false;
    }
    const trimmed = key.trim();
    // Comprimento mínimo e máximo
    if (trimmed.length < 2 || trimmed.length > 50) {
        return false;
    }
    // Regex: somente letras, números, underscore, hífen
    const regex = /^[A-Za-z0-9_-]+$/;
    return regex.test(trimmed);
}
/**
 * Valida múltiplas PermissionKeys e retorna somente as válidas.
 *
 * @param keys Array de PermissionKeys
 * @returns Array filtrado contendo somente keys válidas
 */
export function filterValidPermissions(keys) {
    if (!keys) {
        return [];
    }
    return keys.filter(isValidPermissionKey);
}
/**
 * Valida múltiplas RoleKeys e retorna somente as válidas.
 *
 * @param keys Array de RoleKeys
 * @returns Array filtrado contendo somente keys válidas
 */
export function filterValidRoles(keys) {
    if (!keys) {
        return [];
    }
    return keys.filter(isValidRoleKey);
}
/**
 * Cria um Set de Grants a partir de um array de PermissionKeys.
 * Normaliza e valida automaticamente.
 *
 * @param permissions Array de PermissionKeys
 * @returns Set dedupado de permissions válidas
 */
export function createGrants(permissions) {
    const normalized = normalizePermissions(permissions || []);
    const valid = filterValidPermissions(normalized);
    return new Set(valid);
}
/**
 * Merge múltiplos Grants em um único Set (union).
 *
 * @param grantsSets Array de Sets de Grants
 * @returns Set único mesclado
 */
export function mergeGrants(...grantsSets) {
    const merged = new Set();
    for (const grants of grantsSets) {
        if (grants) {
            grants.forEach((p) => merged.add(p));
        }
    }
    return merged;
}
/**
 * Compara dois roles ignorando case (case-insensitive).
 *
 * @param role1 Primeiro role
 * @param role2 Segundo role
 * @returns true se equivalentes (case-insensitive), false caso contrário
 */
export function rolesEqual(role1, role2) {
    if (!role1 || !role2) {
        return false;
    }
    return role1.trim().toLowerCase() === role2.trim().toLowerCase();
}
/**
 * Verifica se um role está presente em uma lista (case-insensitive).
 *
 * @param role Role a buscar
 * @param roleList Lista de roles
 * @returns true se encontrado, false caso contrário
 */
export function hasRoleInList(role, roleList) {
    if (!role || !roleList || roleList.length === 0) {
        return false;
    }
    const normalized = role.trim().toLowerCase();
    return roleList.some((r) => r.trim().toLowerCase() === normalized);
}
/**
 * Gera um hash simples (não-criptográfico) para cache key.
 * Usado para indexar cache de grants por sessão+contexto.
 *
 * ATENÇÃO: Não usar para segurança. Apenas para dedupe/cache.
 *
 * @param input String(s) a hashear
 * @returns Hash simples (string)
 */
export function simpleCacheKey(...input) {
    const combined = input.filter((s) => s).join('::');
    // Simple hash usando charCodeAt (não-criptográfico)
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}
//# sourceMappingURL=permission-rbac.util.js.map