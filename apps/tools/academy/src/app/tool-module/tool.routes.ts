/**
 * Academy Tool Routes
 *
 * Define o mapa de navegação interno sob /tools/academy
 * Todas as rotas são children de ToolRootComponent
 *
 * Estrutura:
 * - Rota raiz com ToolRootComponent
 * - Children com páginas internas
 * - Rota default (redirect)
 * - Fallback interno (**)
 */

import { Routes } from '@angular/router';
import { ToolRouteData } from './tool-route-data.model';
import { ACADEMY_PERMISSION_KEYS as K } from './tool.permission-map.model';
import { ACADEMY_FEATURE_KEYS as F } from './tool.feature-flags.model';

/**
 * Rotas internas da tool Academy
 *
 * Padrão:
 * - path: '' → ToolRootComponent (container)
 * - children: rotas internas
 * - Primeira rota com redirectTo para default
 * - Última rota com path '**' para fallback
 */
export const TOOL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./tool-root/tool-root.component').then(
        (m) => m.ToolRootComponent
      ),
    children: [
      // Redirect default para overview
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },

      // Página Overview
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/overview.component').then((m) => m.OverviewComponent),
        data: {
          title: 'Visão Geral',
          featureKey: 'academy:overview',
          navGroup: 'main',
          icon: 'dashboard',
          requiredPermissions: [K.VIEW_OVERVIEW],
          requiredFeatures: [F.OVERVIEW],
        } satisfies ToolRouteData,
      },

      // Página Trilhas
      {
        path: 'trilhas',
        loadComponent: () =>
          import('./pages/trilhas/trilhas.component').then(
            (m) => m.TrilhasComponent
          ),
        data: {
          title: 'Trilhas de Aprendizado',
          featureKey: 'academy:trilhas',
          navGroup: 'main',
          icon: 'list',
          requiredPermissions: [K.VIEW_TRILHAS],
          requiredFeatures: [F.TRILHAS],
        } satisfies ToolRouteData,
      },

      // Página Conteúdos
      {
        path: 'conteudos',
        loadComponent: () =>
          import('./pages/conteudos/conteudos.component').then(
            (m) => m.ConteudosComponent
          ),
        data: {
          title: 'Conteúdos',
          featureKey: 'academy:conteudos',
          navGroup: 'main',
          icon: 'folder',
          requiredPermissions: [K.VIEW_CONTEUDOS],
          requiredFeatures: [F.CONTEUDOS],
        } satisfies ToolRouteData,
      },

      // Página AI Criar
      {
        path: 'ai-criar',
        loadComponent: () =>
          import('./pages/ai-criar/ai-criar.component').then(
            (m) => m.AiCriarComponent
          ),
        data: {
          title: 'Criar com IA',
          featureKey: 'academy:ai-criar',
          navGroup: 'tools',
          icon: 'plus',
          requiredPermissions: [K.VIEW_AI_CRIAR],
          requiredFeatures: [F.AI_CRIAR],
        } satisfies ToolRouteData,
      },

      // Página Avaliações
      {
        path: 'avaliacoes',
        loadComponent: () =>
          import('./pages/avaliacoes/avaliacoes.component').then(
            (m) => m.AvaliacoesComponent
          ),
        data: {
          title: 'Avaliações',
          featureKey: 'academy:avaliacoes',
          navGroup: 'main',
          icon: 'check',
          requiredPermissions: [K.VIEW_AVALIACOES],
          requiredFeatures: [F.AVALIACOES],
        } satisfies ToolRouteData,
      },

      // Página Biblioteca
      {
        path: 'biblioteca',
        loadComponent: () =>
          import('./pages/biblioteca/biblioteca.component').then(
            (m) => m.BibliotecaComponent
          ),
        data: {
          title: 'Biblioteca',
          featureKey: 'academy:biblioteca',
          navGroup: 'main',
          icon: 'search',
          requiredPermissions: [K.VIEW_BIBLIOTECA],
          requiredFeatures: [F.BIBLIOTECA],
        } satisfies ToolRouteData,
      },

      // Página Item (com parâmetro)
      {
        path: 'item/:id',
        loadComponent: () =>
          import('./pages/item/item.component').then(
            (m) => m.ItemComponent
          ),
        data: {
          title: 'Item',
          featureKey: 'academy:item',
          navGroup: 'main',
          hidden: true, // Não aparece em menu interno
          requiredPermissions: [K.VIEW_ITEM],
          requiredFeatures: [F.ITEM],
        } satisfies ToolRouteData,
      },

      // Fallback interno: NotFound
      {
        path: '**',
        loadComponent: () =>
          import('./pages/not-found-internal/not-found-internal.component').then(
            (m) => m.NotFoundInternalComponent
          ),
        data: {
          title: 'Página não encontrada',
          hidden: true,
        } satisfies ToolRouteData,
      },
    ],
  },
];



