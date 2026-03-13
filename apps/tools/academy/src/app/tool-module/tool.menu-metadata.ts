/**
 * Academy Tool Menu Metadata
 *
 * Exporta o cartão de identidade da tool Academy para o Hub.
 *
 * Responsabilidades:
 * - Definir TOOL_MENU_METADATA com menu items e deeplinks
 * - Garantir coerência com rotas declaradas em tool.routes.ts
 * - Usar chaves tipadas de permissões e features
 *
 * Integração:
 * - Consumido por tool.contract.ts
 * - Usado pelo NavigationService do Hub para construir menu
 */

import type {
  ToolKey,
  ToolMenuMetadata,
  ToolMenuItem,
  ToolDeepLink,
} from '@hub/tool-contract';
import { ACADEMY_PERMISSION_KEYS as K } from './tool.permission-map.model';
import { ACADEMY_FEATURE_KEYS as F } from './tool.feature-flags.model';

/**
 * TOOL_MENU_METADATA
 *
 * Metadados de menu e navegação da Tool Academy.
 * Coerente com as rotas declaradas em tool.routes.ts.
 */
export const TOOL_MENU_METADATA: ToolMenuMetadata = {
  toolKey: 'academy' as ToolKey,
  accessKey: 'tool.academy.menu',
  displayName: 'Academy',
  description: 'Plataforma de aprendizado e gestão de conteúdo educacional',
  icon: 'list',
  category: 'core',
  order: 50,
  isBeta: false,

  menuItems: [
    {
      id: 'academy-overview',
      label: 'Visão Geral',
      path: 'overview',
      icon: 'dashboard',
      order: 1,
      requiredPermissions: [K.VIEW_OVERVIEW],
      requiredFeatures: [F.OVERVIEW],
    },
    {
      id: 'academy-trilhas',
      label: 'Trilhas',
      path: 'trilhas',
      icon: 'list',
      order: 2,
      requiredPermissions: [K.VIEW_TRILHAS],
      requiredFeatures: [F.TRILHAS],
    },
    {
      id: 'academy-conteudos',
      label: 'Conteúdos',
      path: 'conteudos',
      icon: 'folder',
      order: 3,
      requiredPermissions: [K.VIEW_CONTEUDOS],
      requiredFeatures: [F.CONTEUDOS],
    },
    {
      id: 'academy-avaliacoes',
      label: 'Avaliações',
      path: 'avaliacoes',
      icon: 'check',
      order: 4,
      requiredPermissions: [K.VIEW_AVALIACOES],
      requiredFeatures: [F.AVALIACOES],
    },
    {
      id: 'academy-biblioteca',
      label: 'Biblioteca',
      path: 'biblioteca',
      icon: 'search',
      order: 5,
      requiredPermissions: [K.VIEW_BIBLIOTECA],
      requiredFeatures: [F.BIBLIOTECA],
    },
    {
      id: 'academy-ai-criar',
      label: 'Criar com IA',
      path: 'ai-criar',
      icon: 'plus',
      order: 90,
      badge: 'Beta',
      requiredPermissions: [K.VIEW_AI_CRIAR],
      requiredFeatures: [F.AI_CRIAR],
    },
  ] satisfies ToolMenuItem[],

  deepLinks: [
    {
      id: 'academy-overview',
      path: '/tools/academy/overview',
      label: 'Visão Geral',
      description: 'Página de visão geral da Academy',
      icon: 'dashboard',
      requiredPermissions: [K.VIEW_OVERVIEW],
      requiredFeatures: [F.OVERVIEW],
    },
    {
      id: 'academy-trilhas',
      path: '/tools/academy/trilhas',
      label: 'Trilhas de Aprendizado',
      description: 'Navegação de trilhas de aprendizado',
      icon: 'list',
      requiredPermissions: [K.VIEW_TRILHAS],
      requiredFeatures: [F.TRILHAS],
    },
    {
      id: 'academy-conteudos',
      path: '/tools/academy/conteudos',
      label: 'Conteúdos',
      description: 'Catálogo de conteúdos educacionais',
      icon: 'folder',
      requiredPermissions: [K.VIEW_CONTEUDOS],
      requiredFeatures: [F.CONTEUDOS],
    },
    {
      id: 'academy-avaliacoes',
      path: '/tools/academy/avaliacoes',
      label: 'Avaliações',
      description: 'Sistema de avaliações e testes',
      icon: 'check',
      requiredPermissions: [K.VIEW_AVALIACOES],
      requiredFeatures: [F.AVALIACOES],
    },
    {
      id: 'academy-biblioteca',
      path: '/tools/academy/biblioteca',
      label: 'Biblioteca',
      description: 'Biblioteca de recursos educacionais',
      icon: 'search',
      requiredPermissions: [K.VIEW_BIBLIOTECA],
      requiredFeatures: [F.BIBLIOTECA],
    },
    {
      id: 'academy-ai-criar',
      path: '/tools/academy/ai-criar',
      label: 'Criar com IA',
      description: 'Ferramentas de criação de conteúdo com IA (Beta)',
      icon: 'plus',
      requiredPermissions: [K.VIEW_AI_CRIAR],
      requiredFeatures: [F.AI_CRIAR],
    },
  ] satisfies ToolDeepLink[],
};
