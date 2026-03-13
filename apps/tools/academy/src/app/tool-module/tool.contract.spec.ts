/**
 * Academy Tool Contract - Consistency Tests
 *
 * Valida coerência entre contrato, rotas, menu e flags.
 */

import {
  TOOL_KEY,
  TOOL_ROUTES,
  TOOL_MENU_METADATA,
  TOOL_PERMISSION_MAP,
  TOOL_FEATURE_FLAGS,
} from './tool.contract';

describe('Academy Tool Contract', () => {
  describe('TOOL_KEY', () => {
    it('should be "academy"', () => {
      expect(TOOL_KEY).toBe('academy');
    });
  });

  describe('TOOL_MENU_METADATA', () => {
    it('should have toolKey = academy', () => {
      expect(TOOL_MENU_METADATA.toolKey).toBe('academy');
    });

    it('should have displayName', () => {
      expect(TOOL_MENU_METADATA.displayName).toBeTruthy();
    });

    it('should have menuItems', () => {
      expect(TOOL_MENU_METADATA.menuItems).toBeDefined();
      expect(TOOL_MENU_METADATA.menuItems.length).toBeGreaterThan(0);
    });

    it('should have deepLinks', () => {
      expect(TOOL_MENU_METADATA.deepLinks).toBeDefined();
      expect(TOOL_MENU_METADATA.deepLinks?.length).toBeGreaterThan(0);
    });

    it('all menuItems should have required fields', () => {
      TOOL_MENU_METADATA.menuItems.forEach((item) => {
        expect(item.id).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.path).toBeTruthy();
      });
    });

    it('all deepLinks should have required fields', () => {
      TOOL_MENU_METADATA.deepLinks?.forEach((link) => {
        expect(link.id).toBeTruthy();
        expect(link.path).toBeTruthy();
        expect(link.label).toBeTruthy();
      });
    });
  });

  describe('TOOL_PERMISSION_MAP', () => {
    it('should have toolKey = academy', () => {
      expect(TOOL_PERMISSION_MAP.toolKey).toBe('academy');
    });

    it('should have scopes', () => {
      expect(TOOL_PERMISSION_MAP.scopes).toBeDefined();
      expect(TOOL_PERMISSION_MAP.scopes?.length).toBeGreaterThan(0);
    });

    // Nota: actionId em scopes não incluem namespace (são IDs organizacionais).
    // O namespace 'academy:' está aplicado nas permission keys (ACADEMY_PERMISSION_KEYS).
  });

  describe('TOOL_FEATURE_FLAGS', () => {
    it('should have toolKey = academy', () => {
      expect(TOOL_FEATURE_FLAGS.toolKey).toBe('academy');
    });

    it('should have flags', () => {
      expect(TOOL_FEATURE_FLAGS.flags).toBeDefined();
      expect(TOOL_FEATURE_FLAGS.flags.length).toBeGreaterThan(0);
    });

    it('all flags should be namespaced with academy:', () => {
      TOOL_FEATURE_FLAGS.flags.forEach((flag) => {
        expect(flag.key).toMatch(/^academy:/);
      });
    });

    it('all flags should have required fields', () => {
      TOOL_FEATURE_FLAGS.flags.forEach((flag) => {
        expect(flag.key).toBeTruthy();
        expect(flag.name).toBeTruthy();
        expect(flag.description).toBeTruthy();
        expect(typeof flag.defaultEnabled).toBe('boolean');
      });
    });
  });

  describe('Consistency: Menu Items vs Routes', () => {
    it('all menuItem paths should exist in routes', () => {
      const rootRoute = TOOL_ROUTES[0];
      const children = rootRoute.children ?? [];
      const routePaths = children.map((r) => r.path);

      TOOL_MENU_METADATA.menuItems.forEach((item) => {
        expect(routePaths).toContain(item.path);
      });
    });
  });
});

