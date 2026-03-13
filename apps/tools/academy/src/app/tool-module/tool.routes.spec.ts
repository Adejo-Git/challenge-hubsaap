/**
 * Academy Tool Routes - Consistency Tests
 *
 * Valida estrutura e coerência das rotas internas.
 */

import { TOOL_ROUTES } from './tool.routes';

describe('Academy TOOL_ROUTES', () => {
  it('should have root route with empty path', () => {
    expect(TOOL_ROUTES.length).toBeGreaterThan(0);
    expect(TOOL_ROUTES[0].path).toBe('');
  });

  it('should have children routes', () => {
    const rootRoute = TOOL_ROUTES[0];
    expect(rootRoute.children).toBeDefined();
    const children = rootRoute.children ?? [];
    expect(children.length).toBeGreaterThan(0);
  });

  it('should have redirect default route', () => {
    const rootRoute = TOOL_ROUTES[0];
    const children = rootRoute.children ?? [];
    const redirectRoute = children.find(
      (r) => r.redirectTo === 'overview'
    );
    expect(redirectRoute).toBeDefined();
    if (redirectRoute) {
      expect(redirectRoute.path).toBe('');
      expect(redirectRoute.pathMatch).toBe('full');
    }
  });

  it('should have fallback route (**)', () => {
    const rootRoute = TOOL_ROUTES[0];
    const children = rootRoute.children ?? [];
    const fallbackRoute = children.find((r) => r.path === '**');
    expect(fallbackRoute).toBeDefined();
  });

  it('should have expected page routes', () => {
    const rootRoute = TOOL_ROUTES[0];
    const children = rootRoute.children ?? [];
    const expectedPaths = [
      'overview',
      'trilhas',
      'conteudos',
      'ai-criar',
      'avaliacoes',
      'biblioteca',
      'item/:id',
    ];

    expectedPaths.forEach((path) => {
      const route = children.find((r) => r.path === path);
      expect(route).toBeDefined();
    });
  });

  it('all routes with data should have required fields', () => {
    const rootRoute = TOOL_ROUTES[0];
    const children = rootRoute.children ?? [];
    const routesWithData = children.filter((r) => r.data);

    routesWithData.forEach((route) => {
      expect(route.data).toHaveProperty('title');
    });
  });
});

