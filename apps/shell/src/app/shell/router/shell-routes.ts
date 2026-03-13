import { Routes } from '@angular/router';

/**
 * Shell Routes Configuration
 *
 * Define as rotas base do Hub-Saap:
 * - Rotas base: dashboard, catálogo, documentação, perfil
 * - Rotas de erro: 401, 403, 404
 * - Rota /tools/* para lazy loading de tools (delegada a tool-routes.ts)
 *
 * Convenção:
 * - Todas as rotas carregam no <router-outlet> do AppShellComponent
 * - AppShellComponent já é renderizado em app.component.ts
 * - /tools/* é a convenção padrão para lazy loading
 * - Fallback wildcard (**) redireciona para 404
 */
export const shellRoutes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('../dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    data: {
      title: 'Dashboard',
      breadcrumb: 'Dashboard',
    },
  },
  {
    path: 'tools',
    children: [
      {
        path: ':toolKey',
        loadChildren: () =>
          import('./tool-routes').then((m) => m.toolChildRoutes),
        data: {
          title: 'Ferramentas',
        },
      },
    ],
  },
  /**
   * Error Pages
   */
  {
    path: 'error',
    children: [
      {
        path: '401',
        loadComponent: () =>
          import('../../errors/error-401/error-401.component').then(
            (m) => m.Error401Component
          ),
        data: {
          title: 'Não Autorizado',
          errorCode: '401',
        },
      },
      {
        path: '403',
        loadComponent: () =>
          import('../../errors/error-403/error-403.component').then(
            (m) => m.Error403Component
          ),
        data: {
          title: 'Acesso Negado',
          errorCode: '403',
        },
      },
      {
        path: '404',
        loadComponent: () =>
          import('../../errors/error-404/error-404.component').then(
            (m) => m.Error404Component
          ),
        data: {
          title: 'Página não encontrada',
          errorCode: '404',
        },
      },
    ],
  },
  /**
   * Wildcard: redireciona para 404
   */
  {
    path: '**',
    redirectTo: '/error/404',
    pathMatch: 'full',
  },
];
