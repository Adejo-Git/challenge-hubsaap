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
import { createGrants, mergeGrants } from './permission-rbac.util';

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
export function buildPermissionMap(config: PermissionMapConfig): PermissionMap {
  const map = new Map<RoleKey, RoleDefinition>();

  for (const role of config.roles) {
    const normalizedKey = role.key.trim().toUpperCase();
    map.set(normalizedKey, role);
  }

  return map;
}

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
export function resolveRolePermissions(
  roleKey: RoleKey,
  map: PermissionMap,
  _visited: Set<RoleKey> = new Set()
): Grants {
  const normalizedKey = roleKey.trim().toUpperCase();

  // Proteção básica contra ciclos (limite de profundidade)
  if (_visited.has(normalizedKey) || _visited.size > 20) {
    return new Set();
  }

  const roleDef = map.get(normalizedKey);
  if (!roleDef) {
    // Role desconhecido: retorna vazio (não quebra)
    return new Set();
  }

  _visited.add(normalizedKey);

  // Permissões diretas do role
  const directGrants = createGrants(roleDef.permissions);

  // Se não tem extends, retorna direto
  if (!roleDef.extends || roleDef.extends.length === 0) {
    return directGrants;
  }

  // Resolver permissões herdadas de roles estendidos
  const inheritedGrants: Grants[] = roleDef.extends.map((extendedRole) =>
    resolveRolePermissions(extendedRole, map, _visited)
  );

  // Merge: diretas + herdadas
  return mergeGrants(directGrants, ...inheritedGrants);
}

/**
 * Resolve as permissões efetivas de múltiplos roles.
 *
 * @param roles Array de RoleKeys
 * @param map PermissionMap
 * @returns Grants acumulados de todos os roles (union)
 */
export function resolveMultiRolePermissions(
  roles: RoleKey[],
  map: PermissionMap
): Grants {
  if (!roles || roles.length === 0) {
    return new Set();
  }

  const allGrants = roles.map((role) => resolveRolePermissions(role, map));
  return mergeGrants(...allGrants);
}

/**
 * Valida um PermissionMap para detectar problemas comuns.
 *
 * @param map PermissionMap a validar
 * @returns Array de mensagens de warning/erro (vazio se OK)
 */
export function validatePermissionMap(map: PermissionMap): string[] {
  const errors: string[] = [];

  map.forEach((roleDef, roleKey) => {
    // Verifica se extends referencia roles inexistentes
    if (roleDef.extends) {
      for (const extendedRole of roleDef.extends) {
        const normalizedExtended = extendedRole.trim().toUpperCase();
        if (!map.has(normalizedExtended)) {
          errors.push(
            `Role "${roleKey}" extends "${extendedRole}", que não existe no mapa.`
          );
        }
      }
    }

    // Verifica se role não tem permissões nem herança
    if (
      (!roleDef.permissions || roleDef.permissions.length === 0) &&
      (!roleDef.extends || roleDef.extends.length === 0)
    ) {
      errors.push(
        `Role "${roleKey}" não define permissões diretas nem herança (extends).`
      );
    }
  });

  return errors;
}

/**
 * Detecta ciclos simples (A extends B, B extends A) em um PermissionMap.
 *
 * ATENÇÃO: Detecção simples; não cobre grafos complexos com ciclos indiretos profundos.
 *
 * @param map PermissionMap a validar
 * @returns Array de mensagens de erro de ciclos detectados (vazio se OK)
 */
export function detectCycles(map: PermissionMap): string[] {
  const errors: string[] = [];

  map.forEach((roleDef, roleKey) => {
    if (!roleDef.extends) {
      return;
    }

    for (const extendedRole of roleDef.extends) {
      const normalizedExtended = extendedRole.trim().toUpperCase();
      const extendedDef = map.get(normalizedExtended);

      if (extendedDef && extendedDef.extends) {
        // Verifica se o role estendido também estende de volta (ciclo direto)
        if (
          extendedDef.extends.some(
            (e) => e.trim().toUpperCase() === roleKey.toUpperCase()
          )
        ) {
          errors.push(
            `Ciclo detectado: "${roleKey}" extends "${extendedRole}", e "${extendedRole}" extends "${roleKey}".`
          );
        }
      }
    }
  });

  return errors;
}

/**
 * Exemplo de PermissionMap pré-definido (minimal, para testes/demo).
 *
 * Hierarquia de exemplo:
 * - VIEWER: somente leitura
 * - EDITOR: viewer + escrita
 * - ADMIN: editor + gerenciamento
 */
export function createDefaultPermissionMap(): PermissionMap {
  const config: PermissionMapConfig = {
    roles: [
      {
        key: 'VIEWER',
        permissions: ['global.read', 'tool.pip.read', 'tool.project.read'],
        description: 'Permissões básicas de leitura',
      },
      {
        key: 'EDITOR',
        permissions: ['tool.pip.write', 'tool.project.write'],
        extends: ['VIEWER'],
        description: 'Leitura + escrita',
      },
      {
        key: 'ADMIN',
        permissions: [
          'global.manage',
          'tool.pip.delete',
          'tool.project.delete',
          'system.admin',
        ],
        extends: ['EDITOR'],
        description: 'Administrador completo',
      },
    ],
  };

  return buildPermissionMap(config);
}
