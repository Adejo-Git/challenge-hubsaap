/**
 * Academy Tool - Permission Map Model
 *
 * Tipagem do contrato declarativo de permissões da Tool Academy.
 *
 * Responsabilidades:
 * - Definir tipos do contrato (PermissionRule, RuleOperator, PermissionTarget)
 * - Expor ACADEMY_PERMISSION_KEYS como fonte única de chaves tipadas
 * - Derivar AcademyPermissionKey a partir das values da constante
 *
 * Não-responsabilidades:
 * - Nenhuma lógica executável, IO ou injeção de dependências
 * - Não implementa motor de autorização (responsabilidade do Hub / Access Layer)
 * - Não duplica tipos já definidos em @hub/tool-contract
 */

import type { PermissionKey } from '@hub/tool-contract';

// ---------------------------------------------------------------------------
// Operadores lógicos
// ---------------------------------------------------------------------------

/**
 * Operadores de composição lógica para regras de permissão.
 *
 * - AND → todas as chaves são obrigatórias
 * - OR  → qualquer uma das chaves é suficiente
 */
export type RuleOperator = 'AND' | 'OR';

// ---------------------------------------------------------------------------
// Regra declarativa
// ---------------------------------------------------------------------------

/**
 * Regra de permissão associada a um alvo (rota ou ação).
 *
 * Design:
 * - Puramente declarativa: sem código executável
 * - Suporta composição AND/OR simples (evitar árvores profundas)
 * - Descrição opcional para auditoria e revisão de segurança
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
 */
export type PermissionTarget =
  | 'route:overview'
  | 'route:trilhas'
  | 'route:conteudos'
  | 'route:ai-criar'
  | 'route:avaliacoes'
  | 'route:biblioteca'
  | 'route:item'
  | 'action:create-content'
  | 'action:edit-content'
  | 'action:delete-content'
  | 'action:manage-trilhas'
  | 'action:manage-avaliacoes'
  | 'action:ai-generate';

/**
 * Mapa completo de regras declarativas indexado por alvo.
 * Garante que cada PermissionTarget esteja coberto.
 */
export type ToolPermissionRuleMap = Record<PermissionTarget, PermissionRule>;

// ---------------------------------------------------------------------------
// Chaves de permissão namespaceadas desta tool
// ---------------------------------------------------------------------------

/**
 * Catálogo de permission keys da tool academy.
 *
 * Convenção de namespace: `academy:{scope}:{action}`
 * Escopos: view | action | admin
 *
 * Uso:
 *   import { ACADEMY_PERMISSION_KEYS as K } from './tool.permission-map.model';
 *   someRoute.data.requiredPermissions = [K.VIEW_OVERVIEW];
 *
 * Regra: não alterar chaves existentes sem revisão de retrocompatibilidade.
 */
export const ACADEMY_PERMISSION_KEYS = {
  // View permissions (rotas)
  VIEW_OVERVIEW: 'academy:view:overview' as PermissionKey,
  VIEW_TRILHAS: 'academy:view:trilhas' as PermissionKey,
  VIEW_CONTEUDOS: 'academy:view:conteudos' as PermissionKey,
  VIEW_AI_CRIAR: 'academy:view:ai-criar' as PermissionKey,
  VIEW_AVALIACOES: 'academy:view:avaliacoes' as PermissionKey,
  VIEW_BIBLIOTECA: 'academy:view:biblioteca' as PermissionKey,
  VIEW_ITEM: 'academy:view:item' as PermissionKey,

  // Action permissions (capacidades)
  ACTION_CREATE_CONTENT: 'academy:action:create-content' as PermissionKey,
  ACTION_EDIT_CONTENT: 'academy:action:edit-content' as PermissionKey,
  ACTION_DELETE_CONTENT: 'academy:action:delete-content' as PermissionKey,
  ACTION_MANAGE_TRILHAS: 'academy:action:manage-trilhas' as PermissionKey,
  ACTION_MANAGE_AVALIACOES: 'academy:action:manage-avaliacoes' as PermissionKey,
  ACTION_AI_GENERATE: 'academy:action:ai-generate' as PermissionKey,
} as const;

/**
 * Tipo derivado das chaves de permissão da Academy
 */
export type AcademyPermissionKey = (typeof ACADEMY_PERMISSION_KEYS)[keyof typeof ACADEMY_PERMISSION_KEYS];

