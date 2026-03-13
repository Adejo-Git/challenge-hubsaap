/**
 * Model: ToolRouteData
 *
 * Define a estrutura de metadados internos (route.data) das rotas da Tool.
 * Usado para title, featureKey, navGroup, breadcrumbs internos e permissões declarativas.
 *
 * Não confundir com os metadados do Hub (ToolMenuMetadata).
 * Este é uso interno da Tool apenas.
 *
 * Integração com permissões:
 * - requiredPermissions usa TaxMapPermissionKey para evitar magic strings.
 * - A avaliação destas permissões é de responsabilidade do Hub (não da Tool).
 */

import type { PermissionKey } from '@hub/tool-contract';

export interface ToolRouteData {
  /**
   * Título da rota (usado em breadcrumbs/title interno da tool)
   */
  title: string;

  /**
   * Chave da feature desta rota (para feature flags internos)
   */
  featureKey?: string;

  /**
   * Grupo de navegação (se a tool tiver menu/tabs internos)
   */
  navGroup?: string;

  /**
   * Breadcrumbs internos (opcional)
   * Exemplo: ['Dashboard', 'Relatórios', 'Vendas']
   */
  breadcrumbs?: string[];

  /**
   * Ícone da rota (para menu interno, se aplicável)
   */
  icon?: string;

  /**
   * Se true, esta rota não aparece em menus internos
   */
  hidden?: boolean;

  /**
   * Permissões necessárias para acessar esta rota.
   * Declarativo apenas — quem avalia é o Hub (RouteGuards / AccessDecisionService).
   * Use TAX_MAP_PERMISSION_KEYS para evitar magic strings.
   */
  requiredPermissions?: PermissionKey[];
}

/**
 * Type guard para validar se data é ToolRouteData
 */
export function isToolRouteData(data: unknown): data is ToolRouteData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const candidate = data as ToolRouteData;
  return typeof candidate.title === 'string';
}
