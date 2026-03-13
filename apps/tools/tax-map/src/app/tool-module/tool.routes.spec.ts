/**
 * Testes: ToolRoutes
 * 
 * Valida a integridade do mapa de rotas:
 * - Estrutura correta (ToolRoot com children)
 * - Rota default presente
 * - Fallback interno presente
 * - route.data tipado corretamente
 */

import { TOOL_ROUTES, getRouteData, getNavigableRoutes } from './tool.routes';
import { ToolRouteData } from './tool-route-data.model';

describe('ToolRoutes', () => {
  describe('Estrutura básica', () => {
    it('deve ter exatamente uma rota raiz', () => {
      expect(TOOL_ROUTES).toBeDefined();
      expect(TOOL_ROUTES.length).toBe(1);
    });

    it('rota raiz deve ter path vazio', () => {
      const root = TOOL_ROUTES[0];
      expect(root.path).toBe('');
    });

    it('rota raiz deve carregar ToolRootComponent', () => {
      const root = TOOL_ROUTES[0];
      expect(root.loadComponent).toBeDefined();
    });

    it('rota raiz deve ter children', () => {
      const root = TOOL_ROUTES[0];
      expect(root.children).toBeDefined();
      expect(Array.isArray(root.children)).toBe(true);
      expect(root.children?.length ?? 0).toBeGreaterThan(0);
    });
  });

  describe('Rota default', () => {
    it('deve existir redirect default com path vazio', () => {
      const children = TOOL_ROUTES[0].children || [];
      const defaultRoute = children.find(
        (r) => r.path === '' && r.redirectTo
      );
      expect(defaultRoute).toBeDefined();
    });

    it('redirect default deve ter pathMatch full', () => {
      const children = TOOL_ROUTES[0].children || [];
      const defaultRoute = children.find(
        (r) => r.path === '' && r.redirectTo
      );
      expect(defaultRoute?.pathMatch).toBe('full');
    });

    it('redirect default deve apontar para uma rota válida', () => {
      const children = TOOL_ROUTES[0].children || [];
      const defaultRoute = children.find(
        (r) => r.path === '' && r.redirectTo
      );
      const targetPath = defaultRoute?.redirectTo;

      expect(targetPath).toBeDefined();

      // Verifica se a rota alvo existe
      const targetExists = children.some((r) => r.path === targetPath);
      expect(targetExists).toBe(true);
    });
  });

  describe('Fallback interno', () => {
    it('deve existir rota fallback com path **', () => {
      const children = TOOL_ROUTES[0].children || [];
      const fallbackRoute = children.find((r) => r.path === '**');
      expect(fallbackRoute).toBeDefined();
    });

    it('fallback deve ser a última rota', () => {
      const children = TOOL_ROUTES[0].children || [];
      const lastRoute = children[children.length - 1];
      expect(lastRoute.path).toBe('**');
    });

    it('fallback deve carregar componente', () => {
      const children = TOOL_ROUTES[0].children || [];
      const fallbackRoute = children.find((r) => r.path === '**');
      expect(fallbackRoute?.loadComponent).toBeDefined();
    });
  });

  describe('Metadados de rotas (route.data)', () => {
    it('todas as rotas não-redirect devem ter data.title', () => {
      const children = TOOL_ROUTES[0].children || [];
      const routesWithComponent = children.filter(
        (r) => r.loadComponent && !r.redirectTo
      );

      routesWithComponent.forEach((route) => {
        expect(route.data).toBeDefined();
        expect((route.data as ToolRouteData).title).toBeDefined();
        expect(typeof (route.data as ToolRouteData).title).toBe('string');
      });
    });

    it('rotas navegáveis devem ter featureKey', () => {
      const children = TOOL_ROUTES[0].children || [];
      const navigableRoutes = children.filter(
        (r) =>
          r.path &&
          r.path !== '' &&
          r.path !== '**' &&
          !r.redirectTo &&
          !r.data?.['hidden']
      );

      navigableRoutes.forEach((route) => {
        const data = route.data as ToolRouteData;
        expect(data.featureKey).toBeDefined();
        expect(typeof data.featureKey).toBe('string');
      });
    });
  });

  describe('Rotas específicas', () => {
    it('deve ter rota home', () => {
      const children = TOOL_ROUTES[0].children || [];
      const homeRoute = children.find((r) => r.path === 'home');
      expect(homeRoute).toBeDefined();
      expect(homeRoute?.loadComponent).toBeDefined();
    });

    it('deve ter rota dashboard', () => {
      const children = TOOL_ROUTES[0].children || [];
      const dashboardRoute = children.find((r) => r.path === 'dashboard');
      expect(dashboardRoute).toBeDefined();
      expect(dashboardRoute?.loadComponent).toBeDefined();
    });

    it('deve ter rota settings', () => {
      const children = TOOL_ROUTES[0].children || [];
      const settingsRoute = children.find((r) => r.path === 'settings');
      expect(settingsRoute).toBeDefined();
      expect(settingsRoute?.loadComponent).toBeDefined();
    });

    it('deve ter rota details com parâmetro :id', () => {
      const children = TOOL_ROUTES[0].children || [];
      const detailsRoute = children.find((r) => r.path === 'details/:id');
      expect(detailsRoute).toBeDefined();
      expect(detailsRoute?.loadComponent).toBeDefined();
      expect((detailsRoute?.data as ToolRouteData)?.hidden).toBe(true);
    });
  });

  describe('Helpers', () => {
    it('getRouteData deve retornar data tipado', () => {
      const children = TOOL_ROUTES[0].children || [];
      const homeRoute = children.find((r) => r.path === 'home');
      expect(homeRoute).toBeDefined();
      const data = getRouteData(homeRoute ?? children[0]);

      expect(data).toBeDefined();
      expect(data?.title).toBe('Início');
      expect(data?.featureKey).toBe('home');
    });

    it('getNavigableRoutes deve excluir rotas hidden, redirect e fallback', () => {
      const navigable = getNavigableRoutes();

      expect(navigable.length).toBeGreaterThan(0);

      // Não deve incluir redirect
      expect(navigable.some((r) => r.path === '')).toBe(false);

      // Não deve incluir fallback
      expect(navigable.some((r) => r.path === '**')).toBe(false);

      // Não deve incluir hidden
      expect(navigable.some((r) => r.data.hidden)).toBe(false);

      // Deve incluir home, dashboard, settings
      expect(navigable.some((r) => r.path === 'home')).toBe(true);
      expect(navigable.some((r) => r.path === 'dashboard')).toBe(true);
      expect(navigable.some((r) => r.path === 'settings')).toBe(true);
    });

    it('getNavigableRoutes deve retornar rotas com data completo', () => {
      const navigable = getNavigableRoutes();

      navigable.forEach((route) => {
        expect(route.path).toBeDefined();
        expect(route.data).toBeDefined();
        expect(route.data.title).toBeDefined();
        expect(route.data.featureKey).toBeDefined();
      });
    });
  });

  describe('Validações de segurança', () => {
    it('nenhuma rota deve ter HttpClient ou IO direto', () => {
      const children = TOOL_ROUTES[0].children || [];

      // Verificação estática: rotas não devem ter resolve com IO
      // (em código real, resolvers devem ser evitados ou serem síncronos)
      children.forEach((route) => {
        // Route não deve ter resolve para IO pesado
        // Esta é uma validação conceitual, em código real evitar resolvers com HTTP
        expect(route.resolve).toBeUndefined();
      });
    });

    it('não deve ter loops de redirect', () => {
      const children = TOOL_ROUTES[0].children || [];

      // Redirect deve apontar para rota existente, não para outro redirect
      const redirects = children.filter((r) => r.redirectTo);

      redirects.forEach((redirect) => {
        const target = children.find((r) => r.path === redirect.redirectTo);
        expect(target).toBeDefined();
        expect(target?.redirectTo).toBeUndefined(); // Target não deve ser outro redirect
      });
    });
  });
});
