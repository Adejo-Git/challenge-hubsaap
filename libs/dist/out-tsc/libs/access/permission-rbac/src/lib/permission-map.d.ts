/**
 * @file permission-map.ts
 * @description Estrutura e helpers para a estratégia "map-based" de RBAC.
 *
 * Permite mapear RoleKey → PermissionKey[] com suporte a composição explícita
 * (herança via extends) e override.
 *
 * GUARDRAILS:
 * - Sem HttpClient (map é estático/configurável)
 * - Sem lógica de policy engine (isso é outro layer)
 * - Sem acesso direto a contexto de usuário
 */
import { PermissionKey, RoleKey, Grants } from './permission-rbac.model';
/**
 * Definição de um Role no mapa de permissões.
 */
export interface RoleDefinition {
    /**
     * Chave identificadora do role.
     */
    key: RoleKey;
    /**
     * Permissões diretas atribuídas a este role.
     */
    permissions: PermissionKey[];
    /**
     * Roles dos quais este role herda permissões (composição).
     * Exemplo: "EDITOR" pode estender "VIEWER".
     */
    extends?: RoleKey[];
    /**
     * Descrição opcional do role (para debug/documentação).
     */
    description?: string;
}
/**
 * Mapa completo de roles → permissions.
 * Chave: RoleKey, Valor: RoleDefinition
 */
export type PermissionMap = Map<RoleKey, RoleDefinition>;
/**
 * Configuração básica de um PermissionMap (formato JSON-friendly).
 */
export interface PermissionMapConfig {
    roles: RoleDefinition[];
}
/**
 * Constrói um PermissionMap a partir de uma configuração.
 *
 * @param config Configuração do mapa (array de RoleDefinition)
 * @returns PermissionMap indexado por RoleKey (case-insensitive)
 */
export declare function buildPermissionMap(config: PermissionMapConfig): PermissionMap;
/**
 * Resolve as permissões efetivas de um role, incluindo herança (extends).
 *
 * ATENÇÃO: Não detecta ciclos. Responsabilidade do validador de config.
 *
 * @param roleKey Role a resolver
 * @param map PermissionMap
 * @param _visited Controle interno de visitados (evitar loop infinito)
 * @returns Grants efetivos do role (com herança expandida)
 */
export declare function resolveRolePermissions(roleKey: RoleKey, map: PermissionMap, _visited?: Set<RoleKey>): Grants;
/**
 * Resolve as permissões efetivas de múltiplos roles.
 *
 * @param roles Array de RoleKeys
 * @param map PermissionMap
 * @returns Grants acumulados de todos os roles (union)
 */
export declare function resolveMultiRolePermissions(roles: RoleKey[], map: PermissionMap): Grants;
/**
 * Valida um PermissionMap para detectar problemas comuns.
 *
 * @param map PermissionMap a validar
 * @returns Array de mensagens de warning/erro (vazio se OK)
 */
export declare function validatePermissionMap(map: PermissionMap): string[];
/**
 * Detecta ciclos simples (A extends B, B extends A) em um PermissionMap.
 *
 * ATENÇÃO: Detecção simples; não cobre grafos complexos com ciclos indiretos profundos.
 *
 * @param map PermissionMap a validar
 * @returns Array de mensagens de erro de ciclos detectados (vazio se OK)
 */
export declare function detectCycles(map: PermissionMap): string[];
/**
 * Exemplo de PermissionMap pré-definido (minimal, para testes/demo).
 *
 * Hierarquia de exemplo:
 * - VIEWER: somente leitura
 * - EDITOR: viewer + escrita
 * - ADMIN: editor + gerenciamento
 */
export declare function createDefaultPermissionMap(): PermissionMap;
//# sourceMappingURL=permission-map.d.ts.map