/**
 * ToolPermissionMap Model
 *
 * Tipagem do contrato declarativo de permissões da Tool tax-map.
 *
 * Responsabilidades:
 * - Definir os tipos do contrato (PermissionRule, RuleOperator, PermissionTarget).
 * - Expor a constante TAX_MAP_PERMISSION_KEYS como fonte única de chaves tipadas.
 * - Derivar o tipo TaxMapPermissionKey a partir das values da constante.
 *
 * Não-responsabilidades:
 * - Nenhuma lógica executável, IO ou injeção de dependências.
 * - Não implementa motor de autorização (responsabilidade do Hub / Access Layer).
 * - Não duplica tipos já definidos em @hub/tool-contract.
 */

import type { PermissionKey } from '@hub/tool-contract';

// ---------------------------------------------------------------------------
// Operadores lógicos
// ---------------------------------------------------------------------------

/**
 * Operadores de composição lógica para regras de permissão.
 *
 * - AND → todas as chaves são obrigatórias.
 * - OR  → qualquer uma das chaves é suficiente.
 */
export type RuleOperator = 'AND' | 'OR';

// ---------------------------------------------------------------------------
// Regra declarativa
// ---------------------------------------------------------------------------

/**
 * Regra de permissão associada a um alvo (rota ou ação).
 *
 * Design:
 * - Puramente declarativa: sem código executável.
 * - Suporta composição AND/OR simples (evitar árvores profundas).
 * - Descrição opcional para auditoria e revisão de segurança.
 */
export interface PermissionRule {
  /** Chaves de permissão avaliadas pelo Hub */
  keys: PermissionKey[];

  /** Operador lógico entre as chaves */
  operator: RuleOperator;

  /** Descrição legível para auditoria/documentação */
  description?: string;
}

// ---------------------------------------------------------------------------
// Alvos de permissão
// ---------------------------------------------------------------------------

/**
 * Identificadores estáticos dos alvos que exigem permissão.
 * Subdivide-se em "route:" (entrada/visualização) e "action:" (capacidades).
 *
 * Mantendo a lista explícita, o TypeScript avisa quando um alvo é
 * adicionado nas rotas mas esquecido no mapa de regras.
 */
export type PermissionTarget =
  | 'route:home'
  | 'route:dashboard'
  | 'route:settings'
  | 'route:details'
  | 'action:create'
  | 'action:edit'
  | 'action:delete'
  | 'action:export'
  | 'action:import'
  | 'action:admin:config'
  | 'action:admin:manage-users';

/**
 * Mapa completo de regras declarativas indexado por alvo.
 * Garante que cada PermissionTarget esteja coberto.
 */
export type ToolPermissionRuleMap = Record<PermissionTarget, PermissionRule>;

// ---------------------------------------------------------------------------
// Chaves de permissão namespaceadas desta tool
// ---------------------------------------------------------------------------

/**
 * Catálogo de permission keys da tool tax-map.
 *
 * Convenção de namespace: `tax-map:{scope}:{action}`
 * Escopos: view | action | admin
 *
 * Uso:
 *   import { TAX_MAP_PERMISSION_KEYS as K } from './tool.permission-map.model';
 *   someRoute.data.requiredPermissions = [K.VIEW_HOME];
 *
 * Regra: não alterar chaves existentes sem revisão de retrocompatibilidade.
 */
export const TAX_MAP_PERMISSION_KEYS = {
  // -- Visualização (entrada em rotas) --
  VIEW_HOME:      'tax-map:view:home'      as PermissionKey,
  VIEW_DASHBOARD: 'tax-map:view:dashboard' as PermissionKey,
  VIEW_SETTINGS:  'tax-map:view:settings'  as PermissionKey,
  VIEW_DETAILS:   'tax-map:view:details'   as PermissionKey,

  // -- Ações (capacidades funcionais) --
  ACTION_CREATE: 'tax-map:action:create' as PermissionKey,
  ACTION_EDIT:   'tax-map:action:edit'   as PermissionKey,
  ACTION_DELETE: 'tax-map:action:delete' as PermissionKey,
  ACTION_EXPORT: 'tax-map:action:export' as PermissionKey,
  ACTION_IMPORT: 'tax-map:action:import' as PermissionKey,

  // -- Administração --
  ADMIN_CONFIG:        'tax-map:admin:config'        as PermissionKey,
  ADMIN_MANAGE_USERS:  'tax-map:admin:manage-users'  as PermissionKey,
} as const;

/**
 * Union type de todas as permission keys desta tool.
 * Derivado automaticamente da constante — não precisa ser mantido manualmente.
 */
export type TaxMapPermissionKey =
  (typeof TAX_MAP_PERMISSION_KEYS)[keyof typeof TAX_MAP_PERMISSION_KEYS];
