/**
 * ToolRouteData Model
 *
 * Modelo de dados anexados às rotas internas da Tool Academy.
 * Usado para gating declarativo (permissões e feature flags).
 *
 * Responsabilidades:
 * - Definir estrutura de dados para route.data
 * - Facilitar type-safety em rotas
 * - Suportar gating via Access Layer
 */

import type { PermissionKey, FeatureKey } from '@hub/tool-contract';

/**
 * Dados anexados a cada rota interna da tool
 * Consumidos por guards para decisões de acesso
 */
export interface ToolRouteData {
  /** Título da página (usado em breadcrumbs/título do navegador) */
  title: string;

  /** Chave da feature associada (namespaceada com toolKey) */
  featureKey?: string;

  /** Grupo de navegação (usado para agrupamento no menu interno) */
  navGroup?: 'main' | 'config' | 'tools' | 'reports';

  /** Ícone associado à rota */
  icon?: string;

  /** Se true, não aparece em menus internos */
  hidden?: boolean;

  /** Permissões necessárias para acessar esta rota (OR logic) */
  requiredPermissions?: PermissionKey[];

  /** Features flags necessárias para acessar esta rota (AND logic) */
  requiredFeatures?: FeatureKey[];
}

