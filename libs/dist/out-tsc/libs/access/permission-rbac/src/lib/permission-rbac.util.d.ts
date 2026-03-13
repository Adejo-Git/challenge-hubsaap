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
import { PermissionKey, RoleKey } from './permission-rbac.model';
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
export declare function normalizePermissions(permissions: PermissionKey | PermissionKey[] | undefined | null): PermissionKey[];
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
export declare function normalizeRoles(roles: RoleKey | RoleKey[] | undefined | null): RoleKey[];
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
export declare function isValidPermissionKey(key: PermissionKey | undefined | null): boolean;
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
export declare function isValidRoleKey(key: RoleKey | undefined | null): boolean;
/**
 * Valida múltiplas PermissionKeys e retorna somente as válidas.
 *
 * @param keys Array de PermissionKeys
 * @returns Array filtrado contendo somente keys válidas
 */
export declare function filterValidPermissions(keys: PermissionKey[] | undefined | null): PermissionKey[];
/**
 * Valida múltiplas RoleKeys e retorna somente as válidas.
 *
 * @param keys Array de RoleKeys
 * @returns Array filtrado contendo somente keys válidas
 */
export declare function filterValidRoles(keys: RoleKey[] | undefined | null): RoleKey[];
/**
 * Cria um Set de Grants a partir de um array de PermissionKeys.
 * Normaliza e valida automaticamente.
 *
 * @param permissions Array de PermissionKeys
 * @returns Set dedupado de permissions válidas
 */
export declare function createGrants(permissions: PermissionKey[] | undefined | null): Set<PermissionKey>;
/**
 * Merge múltiplos Grants em um único Set (union).
 *
 * @param grantsSets Array de Sets de Grants
 * @returns Set único mesclado
 */
export declare function mergeGrants(...grantsSets: Set<PermissionKey>[]): Set<PermissionKey>;
/**
 * Compara dois roles ignorando case (case-insensitive).
 *
 * @param role1 Primeiro role
 * @param role2 Segundo role
 * @returns true se equivalentes (case-insensitive), false caso contrário
 */
export declare function rolesEqual(role1: RoleKey, role2: RoleKey): boolean;
/**
 * Verifica se um role está presente em uma lista (case-insensitive).
 *
 * @param role Role a buscar
 * @param roleList Lista de roles
 * @returns true se encontrado, false caso contrário
 */
export declare function hasRoleInList(role: RoleKey, roleList: RoleKey[]): boolean;
/**
 * Gera um hash simples (não-criptográfico) para cache key.
 * Usado para indexar cache de grants por sessão+contexto.
 *
 * ATENÇÃO: Não usar para segurança. Apenas para dedupe/cache.
 *
 * @param input String(s) a hashear
 * @returns Hash simples (string)
 */
export declare function simpleCacheKey(...input: string[]): string;
//# sourceMappingURL=permission-rbac.util.d.ts.map