/**
 * @file permission-rbac.spec.ts
 * @description Testes mínimos para PermissionRbacService (sem dependências Angular/TestBed).
 *
 * Cobertura mínima:
 * - Estratégia claims-only (allow/deny)
 * - Estratégia map-based (allow/deny)
 * - Estratégia hybrid
 * - Cache hit/miss
 * - Invalidação de cache (sessão/contexto)
 * - explain() (granted, missing-permission, missing-role, invalid-key)
 * - Configuração inválida
 */

import { PermissionRbacService } from './permission-rbac.service';
import { PermissionRbacCache } from './permission-rbac.cache';
import { createDefaultPermissionMap } from './permission-map';
import { ClaimsLite, RbacConfig } from './permission-rbac.model';

describe('PermissionRbacService', () => {
  let service: PermissionRbacService;
  let cache: PermissionRbacCache;

  beforeEach(() => {
    cache = new PermissionRbacCache();
    service = new PermissionRbacService(undefined, cache);
  });

  afterEach(() => {
    service.clearSession();
    cache.clear();
  });

  describe('claims-only strategy', () => {
    it('should grant permission if present in claims', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-1',
        permissions: ['tool.pip.read', 'tool.project.write'],
      };

      service.setSession(claims);

      expect(service.hasPermission('tool.pip.read')).toBe(true);
      expect(service.hasPermission('tool.project.write')).toBe(true);
    });

    it('should deny permission if absent in claims', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-2',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);

      expect(service.hasPermission('tool.pip.write')).toBe(false);
      expect(service.hasPermission('global.admin')).toBe(false);
    });

    it('should return false if session is not set', () => {
      expect(service.hasPermission('tool.pip.read')).toBe(false);
    });
  });

  describe('map-based strategy', () => {
    beforeEach(() => {
      const config: RbacConfig = {
        strategy: 'map-based',
        enableCache: true,
      };

      const map = createDefaultPermissionMap();

      service = new PermissionRbacService(config, cache, map);
    });

    it('should grant permission derived from role (VIEWER)', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-3',
        roles: ['VIEWER'],
      };

      service.setSession(claims);

      expect(service.hasPermission('tool.pip.read')).toBe(true);
      expect(service.hasPermission('global.read')).toBe(true);
    });

    it('should grant inherited permissions (EDITOR extends VIEWER)', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-4',
        roles: ['EDITOR'],
      };

      service.setSession(claims);

      // Permissões diretas de EDITOR
      expect(service.hasPermission('tool.pip.write')).toBe(true);

      // Permissões herdadas de VIEWER
      expect(service.hasPermission('tool.pip.read')).toBe(true);
      expect(service.hasPermission('global.read')).toBe(true);
    });

    it('should grant full admin permissions (ADMIN extends EDITOR)', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-5',
        roles: ['ADMIN'],
      };

      service.setSession(claims);

      // Permissões de ADMIN
      expect(service.hasPermission('global.manage')).toBe(true);
      expect(service.hasPermission('system.admin')).toBe(true);

      // Permissões herdadas de EDITOR
      expect(service.hasPermission('tool.pip.write')).toBe(true);

      // Permissões herdadas de VIEWER (via EDITOR)
      expect(service.hasPermission('tool.pip.read')).toBe(true);
    });

    it('should deny permission if role does not grant it', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-6',
        roles: ['VIEWER'],
      };

      service.setSession(claims);

      expect(service.hasPermission('tool.pip.write')).toBe(false);
      expect(service.hasPermission('global.manage')).toBe(false);
    });
  });

  describe('hybrid strategy', () => {
    beforeEach(() => {
      const config: RbacConfig = {
        strategy: 'hybrid',
        enableCache: true,
      };

      const map = createDefaultPermissionMap();

      service = new PermissionRbacService(config, cache, map);
    });

    it('should merge claims + map permissions', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-7',
        roles: ['VIEWER'],
        permissions: ['custom.feature.access'],
      };

      service.setSession(claims);

      // De claims diretas
      expect(service.hasPermission('custom.feature.access')).toBe(true);

      // De map (VIEWER)
      expect(service.hasPermission('tool.pip.read')).toBe(true);
      expect(service.hasPermission('global.read')).toBe(true);
    });
  });

  describe('hasRole', () => {
    it('should return true if user has role', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-8',
        roles: ['ADMIN', 'EDITOR'],
      };

      service.setSession(claims);

      expect(service.hasRole('ADMIN')).toBe(true);
      expect(service.hasRole('EDITOR')).toBe(true);
    });

    it('should return false if user does not have role', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-9',
        roles: ['VIEWER'],
      };

      service.setSession(claims);

      expect(service.hasRole('ADMIN')).toBe(false);
    });

    it('should support case-insensitive role check', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-10',
        roles: ['Admin'],
      };

      service.setSession(claims);

      expect(service.hasRole('admin')).toBe(true);
      expect(service.hasRole('ADMIN')).toBe(true);
    });

    it('should support multiple roles (any behavior)', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-11',
        roles: ['VIEWER'],
      };

      service.setSession(claims);

      expect(service.hasRole(['VIEWER', 'ADMIN'])).toBe(true); // any
      expect(service.hasRole(['VIEWER', 'ADMIN'], { behavior: 'all' })).toBe(false); // all
    });
  });

  describe('cache', () => {
    it('should cache grants after first resolution', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-12',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);

      // Primeira resolução (miss)
      expect(cache.has(claims.sessionId)).toBe(false);
      const grants1 = service.resolveGrants();
      expect(cache.has(claims.sessionId)).toBe(true);

      // Segunda resolução (hit)
      const grants2 = service.resolveGrants();
      expect(grants2).toBe(grants1); // Mesma referência (cache hit)
    });

    it('should invalidate cache on session change', () => {
      const claims1: ClaimsLite = {
        sessionId: 'session-13',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims1);
      service.resolveGrants();
      expect(cache.has(claims1.sessionId)).toBe(true);

      // Trocar sessão
      const claims2: ClaimsLite = {
        sessionId: 'session-14',
        permissions: ['tool.pip.write'],
      };

      service.setSession(claims2);

      // Cache da sessão anterior deve estar limpo
      expect(cache.has(claims1.sessionId)).toBe(false);
    });

    it('should invalidate cache on context change', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-15',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);
      service.setContext('context-A');
      service.resolveGrants();
      expect(cache.has(claims.sessionId, 'context-A')).toBe(true);

      // Trocar contexto
      service.setContext('context-B');

      // Cache do contexto anterior deve estar limpo
      expect(cache.has(claims.sessionId, 'context-A')).toBe(false);
    });
  });

  describe('explain', () => {
    it('should return "granted" if permission is present', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-16',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);

      const result = service.explain('tool.pip.read');
      expect(result.code).toBe('granted');
      expect(result.message).toContain('concedida');
    });

    it('should return "missing-permission" if permission is absent', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-17',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);

      const result = service.explain('tool.pip.write');
      expect(result.code).toBe('missing-permission');
      expect(result.message).toContain('ausente');
    });

    it('should return "invalid-key" for invalid permission', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-18',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);

      const result = service.explain('INVALID KEY!!!');
      expect(result.code).toBe('invalid-key');
      expect(result.message).toContain('inválida');
    });

    it('should return "no-session" if session is not set', () => {
      const result = service.explain('tool.pip.read');
      expect(result.code).toBe('no-session');
      expect(result.message).toContain('Sessão não disponível');
    });

    it('should not expose sensitive data in explain', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-19',
        permissions: ['tool.pip.read'],
        roles: ['SENSITIVE_ROLE'],
      };

      service.setSession(claims);

      const result = service.explain('tool.pip.write');

      // Verificar que não expõe roles/claims completas
      expect(result.message).not.toContain('SENSITIVE_ROLE');
      expect(result.message).not.toContain('session-19');
    });
  });

  describe('explainRole', () => {
    it('should return "granted" if role is present', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-20',
        roles: ['ADMIN'],
      };

      service.setSession(claims);

      const result = service.explainRole('ADMIN');
      expect(result.code).toBe('granted');
      expect(result.message).toContain('presente');
    });

    it('should return "missing-role" if role is absent', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-21',
        roles: ['VIEWER'],
      };

      service.setSession(claims);

      const result = service.explainRole('ADMIN');
      expect(result.code).toBe('missing-role');
      expect(result.message).toContain('ausente');
    });

    it('should return "invalid-key" for invalid role', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-22',
        roles: ['ADMIN'],
      };

      service.setSession(claims);

      const result = service.explainRole('INVALID!!!');
      expect(result.code).toBe('invalid-key');
      expect(result.message).toContain('inválida');
    });
  });

  describe('behavior options (any|all)', () => {
    it('should support "any" behavior for hasPermission', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-23',
        permissions: ['tool.pip.read', 'tool.project.write'],
      };

      service.setSession(claims);

      expect(
        service.hasPermission(['tool.pip.read', 'nonexistent.permission'], {
          behavior: 'any',
        })
      ).toBe(true);
    });

    it('should support "all" behavior for hasPermission', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-24',
        permissions: ['tool.pip.read', 'tool.project.write'],
      };

      service.setSession(claims);

      expect(
        service.hasPermission(['tool.pip.read', 'tool.project.write'], {
          behavior: 'all',
        })
      ).toBe(true);

      expect(
        service.hasPermission(['tool.pip.read', 'nonexistent.permission'], {
          behavior: 'all',
        })
      ).toBe(false);
    });
  });

  // ========== Novos Testes para Cobertura Máxima ==========

  describe('unsupported strategy', () => {
    it('should return empty Set for invalid strategy (graceful degradation)', () => {
      const config = {
        strategy: 'invalid-strategy',
        enableCache: false, // Desabilitar cache para forçar resolução
      } as unknown as RbacConfig;

      service = new PermissionRbacService(config, cache);

      const claims: ClaimsLite = {
        sessionId: 'session-25',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);

      // resolveGrants deve retornar Set vazio (não quebrar)
      const grants = service.resolveGrants();
      expect(grants).toBeInstanceOf(Set);
      expect(grants.size).toBe(0);
    });
  });

  describe('clearSession', () => {
    it('should invalidate cache and clear current session', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-26',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);
      service.resolveGrants();

      expect(cache.has(claims.sessionId)).toBe(true);
      expect(service.hasPermission('tool.pip.read')).toBe(true);

      // Limpar sessão
      service.clearSession();

      expect(cache.has(claims.sessionId)).toBe(false);
      expect(service.hasPermission('tool.pip.read')).toBe(false);
    });
  });

  describe('groups in claims', () => {
    it('should respect groups in addition to roles for hasRole', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-27',
        roles: ['VIEWER'],
        groups: ['ADMIN', 'EDITOR'],
      };

      service.setSession(claims);

      // Roles
      expect(service.hasRole('VIEWER')).toBe(true);

      // Groups devem ser normalizados junto com roles
      expect(service.hasRole('ADMIN')).toBe(true);
      expect(service.hasRole('EDITOR')).toBe(true);
    });
  });

  describe('cache with multiple contexts', () => {
    it('should handle cache for same session with different contexts', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-28',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);

      // Contexto A
      service.setContext('context-A');
      service.resolveGrants();
      expect(cache.has(claims.sessionId, 'context-A')).toBe(true);

      // Contexto B
      service.setContext('context-B');
      service.resolveGrants();
      expect(cache.has(claims.sessionId, 'context-B')).toBe(true);

      // Contexto A deve ter sido limpo
      expect(cache.has(claims.sessionId, 'context-A')).toBe(false);

      // Contexto C
      service.setContext('context-C');
      service.resolveGrants();
      expect(cache.has(claims.sessionId, 'context-C')).toBe(true);

      // Contexto B deve ter sido limpo
      expect(cache.has(claims.sessionId, 'context-B')).toBe(false);
    });
  });

  describe('map-based with multiple roles', () => {
    beforeEach(() => {
      const config: RbacConfig = {
        strategy: 'map-based',
        enableCache: true,
      };

      const map = createDefaultPermissionMap();

      service = new PermissionRbacService(config, cache, map);
    });

    it('should union permissions from multiple roles', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-29',
        roles: ['VIEWER', 'EDITOR'],
      };

      service.setSession(claims);

      // VIEWER permissions
      expect(service.hasPermission('tool.pip.read')).toBe(true);
      expect(service.hasPermission('global.read')).toBe(true);

      // EDITOR permissions (including inherited from VIEWER)
      expect(service.hasPermission('tool.pip.write')).toBe(true);
      expect(service.hasPermission('tool.project.write')).toBe(true);

      // Union completo
      const grants = service.resolveGrants();
      expect(grants.size).toBeGreaterThan(0);
    });
  });

  describe('hybrid with inheritance and direct claims', () => {
    beforeEach(() => {
      const config: RbacConfig = {
        strategy: 'hybrid',
        enableCache: true,
      };

      const map = createDefaultPermissionMap();

      service = new PermissionRbacService(config, cache, map);
    });

    it('should merge role inheritance with direct permission claims', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-30',
        roles: ['VIEWER'],
        permissions: ['custom.feature.special', 'custom.feature.experimental'],
      };

      service.setSession(claims);

      // Permissions herdadas via role VIEWER
      expect(service.hasPermission('tool.pip.read')).toBe(true);
      expect(service.hasPermission('global.read')).toBe(true);

      // Permissions diretas via claims
      expect(service.hasPermission('custom.feature.special')).toBe(true);
      expect(service.hasPermission('custom.feature.experimental')).toBe(true);

      // VIEWER não tem write
      expect(service.hasPermission('tool.pip.write')).toBe(false);
    });
  });

  describe('resolveGrants error handling', () => {
    it('should return empty Set when map-based strategy has no map configured', () => {
      const config: RbacConfig = {
        strategy: 'map-based',
        enableCache: false, // Desabilitar cache para forçar resolução
      };

      // Não fornecer permissionMap
      service = new PermissionRbacService(config, cache);

      const claims: ClaimsLite = {
        sessionId: 'session-31',
        roles: ['ADMIN'],
      };

      service.setSession(claims);

      // Deve retornar Set vazio ao invés de quebrar
      const grants = service.resolveGrants();
      expect(grants).toBeInstanceOf(Set);
      expect(grants.size).toBe(0);
    });
  });

  describe('empty arrays', () => {
    it('should return false for hasRole with empty array', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-32',
        roles: ['ADMIN'],
      };

      service.setSession(claims);

      expect(service.hasRole([])).toBe(false);
    });

    it('should return false for hasPermission with empty array', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-33',
        permissions: ['tool.pip.read'],
      };

      service.setSession(claims);

      expect(service.hasPermission([])).toBe(false);
    });
  });

  describe('hasRole with behavior all (all roles present)', () => {
    it('should return true when all required roles are present', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-34',
        roles: ['ADMIN', 'EDITOR', 'VIEWER'],
      };

      service.setSession(claims);

      // behavior='all' com todos os roles presentes
      expect(
        service.hasRole(['ADMIN', 'EDITOR'], { behavior: 'all' })
      ).toBe(true);

      expect(
        service.hasRole(['ADMIN', 'EDITOR', 'VIEWER'], { behavior: 'all' })
      ).toBe(true);

      // behavior='all' com role faltando
      expect(
        service.hasRole(['ADMIN', 'SUPERUSER'], { behavior: 'all' })
      ).toBe(false);
    });
  });

  describe('hasPermission with mixed valid and invalid keys', () => {
    it('should return false when array contains invalid keys', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-35',
        permissions: ['tool.pip.read', 'tool.project.write'],
      };

      service.setSession(claims);

      // Mix de válidas e inválidas - deve retornar false
      expect(
        service.hasPermission([
          'tool.pip.read', // válida
          'INVALID KEY!!!', // inválida
        ])
      ).toBe(false);

      // Todas válidas mas só uma presente
      expect(
        service.hasPermission(
          ['tool.pip.read', 'tool.pip.write'], // write ausente
          { behavior: 'any' }
        )
      ).toBe(true);
    });
  });

  describe('dynamic setPermissionMap', () => {
    it('should allow changing permission map at runtime', () => {
      const config: RbacConfig = {
        strategy: 'map-based',
        enableCache: true,
      };

      const map1 = createDefaultPermissionMap();

      service = new PermissionRbacService(config, cache, map1);

      const claims: ClaimsLite = {
        sessionId: 'session-36',
        roles: ['VIEWER'],
      };

      service.setSession(claims);

      // Com map1
      expect(service.hasPermission('tool.pip.read')).toBe(true);

      // Criar novo map customizado
      const map2 = new Map([
        [
          'VIEWER',
          {
            key: 'VIEWER',
            permissions: ['custom.read'],
            extends: [],
          },
        ],
      ]);

      service.setPermissionMap(map2);
      cache.clear(); // Limpar cache para forçar nova resolução

      // Com map2
      expect(service.hasPermission('custom.read')).toBe(true);
      expect(service.hasPermission('tool.pip.read')).toBe(false); // Não existe no novo map
    });
  });

  describe('explain with map-based inheritance', () => {
    beforeEach(() => {
      const config: RbacConfig = {
        strategy: 'map-based',
        enableCache: true,
      };

      const map = createDefaultPermissionMap();

      service = new PermissionRbacService(config, cache, map);
    });

    it('should explain granted for permission inherited via role', () => {
      const claims: ClaimsLite = {
        sessionId: 'session-37',
        roles: ['ADMIN'], // ADMIN extends EDITOR extends VIEWER
      };

      service.setSession(claims);

      // Permission de VIEWER, mas user é ADMIN (herança)
      const result = service.explain('tool.pip.read');

      expect(result.code).toBe('granted');
      expect(result.message).toContain('concedida');
    });
  });
});
