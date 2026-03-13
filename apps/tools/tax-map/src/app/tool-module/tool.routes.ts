/**
 * ToolRoutes: Rotas internas da Tool
 * 
 * Define o mapa de navegação interno sob /tools/tax-map
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
import { TAX_MAP_PERMISSION_KEYS as K } from './tool.permission-map.model';

/**
 * Rotas internas da tool
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
      import('../tool-root/tool-root.component').then(
        (m) => m.ToolRootComponent
      ),
    children: [
      // Redirect default para home
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },

      // Página Home
      {
        path: 'home',
        loadComponent: () =>
          import('../pages/home/home.component').then((m) => m.HomeComponent),
        data: {
          title: 'Início',
          featureKey: 'home',
          navGroup: 'main',
          icon: 'home',
          requiredPermissions: [K.VIEW_HOME],
        } satisfies ToolRouteData,
      },

      // Página Dashboard
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
        data: {
          title: 'Dashboard',
          featureKey: 'dashboard',
          navGroup: 'main',
          icon: 'dashboard',
          requiredPermissions: [K.VIEW_DASHBOARD],
        } satisfies ToolRouteData,
      },

      // Página de Configurações
      {
        path: 'settings',
        loadComponent: () =>
          import('../pages/settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
        data: {
          title: 'Configurações',
          featureKey: 'settings',
          navGroup: 'config',
          icon: 'settings',
          // OR: view:settings OU admin:config (avaliado pelo Hub)
          requiredPermissions: [K.VIEW_SETTINGS, K.ADMIN_CONFIG],
        } satisfies ToolRouteData,
      },

      // Página de Detalhes (com parâmetro)
      {
        path: 'details/:id',
        loadComponent: () =>
          import('../pages/details/details.component').then(
            (m) => m.DetailsComponent
          ),
        data: {
          title: 'Detalhes',
          featureKey: 'details',
          navGroup: 'main',
          hidden: true, // Não aparece em menu interno
          requiredPermissions: [K.VIEW_DETAILS],
        } satisfies ToolRouteData,
      },

      // Fallback interno: NotFound
      {
        path: '**',
        loadComponent: () =>
          import('../pages/not-found-internal/not-found-internal.component').then(
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

/**
 * Helper: Extrai ToolRouteData de uma rota
 */
export function getRouteData(route: Routes[0]): ToolRouteData | undefined {
  return route.data as ToolRouteData | undefined;
}

/**
 * Helper: Lista todas as rotas navegáveis (exclui hidden, redirect e fallback)
 */
export function getNavigableRoutes(): Array<{
  path: string;
  data: ToolRouteData;
}> {
  const children = TOOL_ROUTES[0]?.children || [];
  return children
    .filter(
      (route) =>
        route.path &&
        route.path !== '' &&
        route.path !== '**' &&
        !route.redirectTo &&
        !route.data?.['hidden']
    )
    .map((route) => ({
      path: route.path || '',
      data: route.data as ToolRouteData,
    }));
}
