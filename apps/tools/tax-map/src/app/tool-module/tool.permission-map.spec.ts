/**
 * Testes de integridade do ToolPermissionMap
 *
 * Objetivo: garantir que o contrato declarativo seja consistente e seguro.
 *
 * Coberturas:
 * 1. Unicidade de chaves — sem duplicatas em TAX_MAP_PERMISSION_KEYS.
 * 2. Namespace correto — todas as chaves seguem "tax-map:{scope}:{action}".
 * 3. Completude — cada alvo (PermissionTarget) possui regra no mapa.
 * 4. Regras válidas — nenhum alvo com lista de chaves vazia.
 * 5. Consistência cruzada — chaves usadas em TOOL_PERMISSION_RULE_MAP
 *    existem em TAX_MAP_PERMISSION_KEYS.
 * 6. allPermissions — lista plana do TOOL_PERMISSION_MAP contém todas as chaves.
 */

import {
  TAX_MAP_PERMISSION_KEYS,
  type PermissionTarget,
} from './tool.permission-map.model';
import { TOOL_PERMISSION_RULE_MAP, TOOL_PERMISSION_MAP } from './tool.permission-map';
import { TOOL_ROUTES } from './tool.routes';
import { TOOL_MENU_METADATA } from './tool.contract';
import { EXAMPLE_TOOL_MENU_METADATA } from './tool.menu-metadata';

// ---------------------------------------------------------------------------
// Helpers locais de teste
// ---------------------------------------------------------------------------

/** Retorna todos os values únicos de um objeto como array de strings */
function objectValues(obj: Record<string, string>): string[] {
  return Object.values(obj);
}

/** Todos os targets definidos no tipo PermissionTarget */
const ALL_TARGETS: PermissionTarget[] = [
  'route:home',
  'route:dashboard',
  'route:settings',
  'route:details',
  'action:create',
  'action:edit',
  'action:delete',
  'action:export',
  'action:import',
  'action:admin:config',
  'action:admin:manage-users',
];

// ---------------------------------------------------------------------------
// Suite de testes
// ---------------------------------------------------------------------------

describe('TAX_MAP_PERMISSION_KEYS — integridade das chaves', () => {
  const allKeys = objectValues(TAX_MAP_PERMISSION_KEYS as Record<string, string>);

  it('não deve conter chaves duplicadas (values únicos)', () => {
    const uniqueKeys = new Set(allKeys);
    expect(uniqueKeys.size).toBe(allKeys.length);
  });

  it('todas as chaves devem seguir o namespace "tax-map:{scope}:{action}"', () => {
    const NAMESPACE_REGEX = /^tax-map:(view|action|admin):[a-z][a-z0-9-]*$/;
    for (const key of allKeys) {
      expect(key).toMatch(NAMESPACE_REGEX);
    }
  });

  it('escopo "view" deve conter ao menos as permissões de entrada de rota', () => {
    const viewKeys = allKeys.filter((k) => k.startsWith('tax-map:view:'));
    expect(viewKeys.length).toBeGreaterThanOrEqual(1);
  });

  it('escopo "action" deve conter ao menos uma permissão funcional', () => {
    const actionKeys = allKeys.filter((k) => k.startsWith('tax-map:action:'));
    expect(actionKeys.length).toBeGreaterThanOrEqual(1);
  });

  it('escopo "admin" deve conter ao menos uma permissão administrativa', () => {
    const adminKeys = allKeys.filter((k) => k.startsWith('tax-map:admin:'));
    expect(adminKeys.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------

describe('TOOL_PERMISSION_RULE_MAP — integridade das regras', () => {
  it('deve cobrir todos os PermissionTargets definidos', () => {
    for (const target of ALL_TARGETS) {
      expect(TOOL_PERMISSION_RULE_MAP).toHaveProperty(target);
    }
  });

  it('nenhum alvo deve ter lista de chaves vazia', () => {
    for (const target of ALL_TARGETS) {
      const rule = TOOL_PERMISSION_RULE_MAP[target];
      expect(rule.keys.length).toBeGreaterThan(0);
    }
  });

  it('todo operador deve ser "AND" ou "OR"', () => {
    for (const target of ALL_TARGETS) {
      const { operator } = TOOL_PERMISSION_RULE_MAP[target];
      expect(['AND', 'OR']).toContain(operator);
    }
  });

  it('todas as chaves usadas nas regras devem existir em TAX_MAP_PERMISSION_KEYS', () => {
    const knownKeys = new Set(
      objectValues(TAX_MAP_PERMISSION_KEYS as Record<string, string>)
    );

    for (const target of ALL_TARGETS) {
      const { keys } = TOOL_PERMISSION_RULE_MAP[target];
      for (const key of keys) {
        expect(knownKeys.has(key)).toBe(true);
      }
    }
  });

  it('regras de rotas de visualização devem usar operador "OR" (não bloquear visualização por padrão)', () => {
    const routeTargets = ALL_TARGETS.filter((t) => t.startsWith('route:'));
    for (const target of routeTargets) {
      expect(TOOL_PERMISSION_RULE_MAP[target].operator).toBe('OR');
    }
  });
});

// ---------------------------------------------------------------------------

describe('TOOL_PERMISSION_MAP — contrato do Hub', () => {
  it('toolKey deve ser "tax-map"', () => {
    expect(TOOL_PERMISSION_MAP.toolKey).toBe('tax-map');
  });

  it('deve declarar os três escopos: view, action, admin', () => {
    expect(TOOL_PERMISSION_MAP.scopes).toBeDefined();
    const scopeIds = TOOL_PERMISSION_MAP.scopes?.map((s) => s.scopeId) || [];
    expect(scopeIds).toContain('view');
    expect(scopeIds).toContain('action');
    expect(scopeIds).toContain('admin');
  });

  it('nenhum escopo deve ter lista de actions vazia', () => {
    const scopes = TOOL_PERMISSION_MAP.scopes || [];
    for (const scope of scopes) {
      expect(scope.actions.length).toBeGreaterThan(0);
    }
  });

  it('allPermissions deve conter todas as chaves de TAX_MAP_PERMISSION_KEYS', () => {
    const expectedKeys = objectValues(
      TAX_MAP_PERMISSION_KEYS as Record<string, string>
    );
    const allPerms = TOOL_PERMISSION_MAP.allPermissions ?? [];

    for (const key of expectedKeys) {
      expect(allPerms).toContain(key);
    }
  });

  it('allPermissions não deve ter duplicatas', () => {
    const allPerms = TOOL_PERMISSION_MAP.allPermissions ?? [];
    const unique = new Set(allPerms);
    expect(unique.size).toBe(allPerms.length);
  });

  it('cada ação de cada escopo deve ter actionId e label preenchidos', () => {
    for (const scope of TOOL_PERMISSION_MAP.scopes ?? []) {
      for (const action of scope.actions) {
        expect(action.actionId.length).toBeGreaterThan(0);
        expect(action.label.length).toBeGreaterThan(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------

describe('Consistência Menu ↔ Rotas (F-004)', () => {
  /**
   * Helper: extrai paths únicos das rotas navegáveis
   * (exclui redirect, fallback e rotas hidden)
   */
  function getNavigableRoutePaths(): Set<string> {
    const children = TOOL_ROUTES[0]?.children || [];
    const paths = children
      .filter(
        (route) =>
          route.path &&
          route.path !== '' &&
          route.path !== '**' &&
          !route.redirectTo &&
          !route.data?.['hidden']
      )
      .map((route) => route.path as string);
    return new Set(paths);
  }

  /**
   * Helper: extrai paths dos menuItems (flatten, sem children aninhados)
   */
  function getMenuItemPaths(menuItems: unknown[]): Set<string> {
    const paths = new Set<string>();
    for (const item of menuItems) {
      const maybe = item as Record<string, unknown>;
      if (typeof maybe['path'] === 'string') {
        paths.add(maybe['path']);
      }
      if (Array.isArray(maybe['children'])) {
        for (const child of (maybe['children'] as unknown[])) {
          const maybeChild = child as Record<string, unknown>;
          if (typeof maybeChild['path'] === 'string') {
            paths.add(maybeChild['path']);
          }
        }
      }
    }
    return paths;
  }

  describe('TOOL_MENU_METADATA (contrato oficial)', () => {
    it('todos os menuItems com path devem ter rota correspondente em TOOL_ROUTES', () => {
      const routePaths = getNavigableRoutePaths();
      const menuPaths = getMenuItemPaths(TOOL_MENU_METADATA.menuItems);

      for (const menuPath of menuPaths) {
        expect(routePaths.has(menuPath)).toBe(true);
      }
    });

    it('todos os deepLinks devem ter rota correspondente em TOOL_ROUTES', () => {
      const routePaths = getNavigableRoutePaths();
      const deepLinks = TOOL_MENU_METADATA.deepLinks || [];

      for (const link of deepLinks) {
        // Remove prefixo /tools/tax-map/ se presente
        const cleanPath = link.path.replace(/^\/tools\/tax-map\//, '').replace(/^\//, '');
        expect(routePaths.has(cleanPath)).toBe(true);
      }
    });
  });

  describe('EXAMPLE_TOOL_MENU_METADATA (exemplo/referência)', () => {
    it('todos os menuItems com path devem ter rota correspondente em TOOL_ROUTES', () => {
      const routePaths = getNavigableRoutePaths();
      const menuPaths = getMenuItemPaths(EXAMPLE_TOOL_MENU_METADATA.menuItems);

      for (const menuPath of menuPaths) {
        expect(routePaths.has(menuPath)).toBe(true);
      }
    });

    it('todos os deepLinks devem ter rota correspondente em TOOL_ROUTES', () => {
      const routePaths = getNavigableRoutePaths();
      const deepLinks = EXAMPLE_TOOL_MENU_METADATA.deepLinks || [];

      for (const link of deepLinks) {
        // Remove prefixo /tools/tax-map/ se presente
        const cleanPath = link.path.replace(/^\/tools\/tax-map\//, '').replace(/^\//, '');
        expect(routePaths.has(cleanPath)).toBe(true);
      }
    });
  });
});
