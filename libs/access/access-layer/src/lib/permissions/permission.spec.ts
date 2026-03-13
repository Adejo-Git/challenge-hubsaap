/**
 * @file permission.spec.ts
 * @description Testes mínimos do PermissionService e componentes relacionados.
 * 
 * Cobertura mínima (conforme Spec):
 * - Model utilities (toPermissionSnapshot, isValidPermissionKeyFormat, EMPTY_PERMISSION_SET)
 * - Adapters (adaptPermissionsFromRbac, batch processing, error handling)
 * - Resolvers (createPermissionResolver, reactive streams, telemetry)
 * - PermissionService (roles→perms, has/canAny/canAll, context switching)
 * 
 * GUARDRAILS:
 * - Não depender de HTTP nem integração real com auth
 * - Usar stubs/mocks de SessionService/ContextService e adapter/RBAC
 * - Testes determinísticos sem timers ou ordem instável
 * - Remover testes de performance/memory (não mínimos)
 */

import { BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { PermissionRbacService, ClaimsLite, Grants } from '@hub/permission-rbac';
import { PermissionService } from './permission.service';
import {
  PermissionSessionSource,
  PermissionContextSource,
  createPermissionResolver,
  createPermissionResolverWithTelemetry,
  PermissionResolveEvent,
} from './permission.resolver';
import {
  PermissionSetLite,
  toPermissionSnapshot,
  isValidPermissionKeyFormat,
  EMPTY_PERMISSION_SET,
} from './permission.model';
import {
  adaptPermissionsFromRbac,
  adaptPermissionsForMultipleContexts,
} from './permission.adapters';
import { ContextLite } from '../context/context.model';

/**
 * Mock SessionSource
 */
class MockSessionSource implements PermissionSessionSource {
  private subject = new BehaviorSubject<ClaimsLite | null>(null);
  public claims$ = this.subject.asObservable();

  setClaims(claims: ClaimsLite | null): void {
    this.subject.next(claims);
  }
}

/**
 * Mock ContextSource
 */
class MockContextSource implements PermissionContextSource {
  private subject = new BehaviorSubject<ContextLite | null>(null);
  public context$ = this.subject.asObservable();

  setContext(context: ContextLite | null): void {
    this.subject.next(context);
  }
}

/**
 * Mock PermissionRbacService
 */
class MockRbacService {
  private mockGrants: Grants = new Set<string>();
  private shouldThrow = false;

  setSession(claims: ClaimsLite): void {
    // stub: aceita claims mas não usa internamente neste mock
    void claims;
  }

  setContext(contextKey: string): void {
    // stub: aceita contextKey mas não usa internamente neste mock
    void contextKey;
  }

  resolveGrants(): Grants {
    if (this.shouldThrow) {
      throw new Error('RBAC error');
    }
    return this.mockGrants;
  }

  setMockGrants(grants: string[]): void {
    this.mockGrants = new Set(grants);
  }

  setShouldThrow(shouldThrow: boolean): void {
    this.shouldThrow = shouldThrow;
  }
}

describe('PermissionService', () => {
  let service: PermissionService;
  let mockSessionSource: MockSessionSource;
  let mockContextSource: MockContextSource;
  let mockRbacService: MockRbacService;

  beforeEach(() => {
    mockSessionSource = new MockSessionSource();
    mockContextSource = new MockContextSource();
    mockRbacService = new MockRbacService();

    service = new PermissionService(
      mockRbacService as unknown as PermissionRbacService,
      mockSessionSource,
      mockContextSource
    );
  });

  describe('Inicialização', () => {
    it('deve inicializar com EMPTY_PERMISSION_SET se não há sessão/contexto', () => {
      const snapshot = service.snapshot();
      expect(snapshot.grants).toEqual([]);
      expect(snapshot.roles).toEqual([]);
      expect(snapshot.contextKey).toBe('none');
    });
  });

  describe('Resolução roles→perms', () => {
    it('deve produzir PermissionSetLite esperado quando roles mudam', (done) => {
      // Configura mock RBAC para retornar grants específicos
      mockRbacService.setMockGrants(['tool.pip.read', 'tool.pip.write']);

      // Define contexto e claims
      mockContextSource.setContext({
        tenantId: 'tenant1',
        clientId: 'client1',
        projectId: 'project1',
      });

      mockSessionSource.setClaims({
        sessionId: 'user123',
        roles: ['ADMIN', 'PIP_EDITOR'],
      });

      // Aguarda emissão no stream
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          expect(set.grants.has('tool.pip.read')).toBe(true);
          expect(set.grants.has('tool.pip.write')).toBe(true);
          expect(set.roles).toEqual(['ADMIN', 'PIP_EDITOR']);
          expect(set.contextKey).toContain('tenant1');
          done();
        }
      });
    });
  });

  describe('Funções has/canAny/canAll', () => {
    beforeEach(() => {
      mockRbacService.setMockGrants(['tool.pip.read', 'tool.pip.write', 'tool.analytics.read']);
      mockContextSource.setContext({ tenantId: 'tenant1' });
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['ADMIN'] });
    });

    it('has() deve retornar true para permissão existente', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          expect(service.has('tool.pip.read')).toBe(true);
          expect(service.has('tool.pip.write')).toBe(true);
          done();
        }
      });
    });

    it('has() deve retornar false para permissão inexistente', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          expect(service.has('tool.pip.delete')).toBe(false);
          done();
        }
      });
    });

    it('has() deve retornar false para chave inválida', () => {
      expect(service.has('')).toBe(false);
      expect(service.has('invalid')).toBe(false);
    });

    it('canAny() deve retornar true se pelo menos uma permissão existe', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          expect(service.canAny(['tool.pip.read', 'tool.pip.delete'])).toBe(true);
          done();
        }
      });
    });

    it('canAny() deve retornar false se nenhuma permissão existe', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          expect(service.canAny(['tool.pip.delete', 'tool.pip.manage'])).toBe(false);
          done();
        }
      });
    });

    it('canAny() deve retornar false para array vazio', () => {
      expect(service.canAny([])).toBe(false);
    });

    it('canAll() deve retornar true se todas as permissões existem', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          expect(service.canAll(['tool.pip.read', 'tool.pip.write'])).toBe(true);
          done();
        }
      });
    });

    it('canAll() deve retornar false se alguma permissão não existe', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          expect(service.canAll(['tool.pip.read', 'tool.pip.delete'])).toBe(false);
          done();
        }
      });
    });

    it('canAll() deve retornar true para array vazio (vacuous truth)', () => {
      expect(service.canAll([])).toBe(true);
    });
  });

  describe('Troca de contexto', () => {
    it('deve emitir novo set quando contexto muda', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });

      let emissionCount = 0;
      service.permissions$.subscribe((set) => {
        emissionCount++;
        if (emissionCount === 1) {
          // Primeira emissão: contexto inicial
          mockContextSource.setContext({ tenantId: 'tenant1' });
        } else if (emissionCount === 2) {
          // Segunda emissão: contexto mudou
          expect(set.contextKey).toContain('tenant1');
          mockContextSource.setContext({ tenantId: 'tenant2' });
        } else if (emissionCount === 3) {
          // Terceira emissão: contexto mudou novamente
          expect(set.contextKey).toContain('tenant2');
          done();
        }
      });

      // Dispara primeira mudança
      mockContextSource.setContext({ tenantId: 'tenant0' });
    });

    it('snapshot() deve refletir o último valor emitido', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockContextSource.setContext({ tenantId: 'tenant1' });
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });

      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          const snapshot = service.snapshot();
          expect(snapshot.contextKey).toContain('tenant1');
          expect(snapshot.grants).toContain('tool.pip.read');
          done();
        }
      });
    });
  });

  describe('Login/logout/refresh', () => {
    it('deve recomputar quando claims mudam (login)', (done) => {
      mockRbacService.setMockGrants([]);
      mockContextSource.setContext({ tenantId: 'tenant1' });

      let emissionCount = 0;
      service.permissions$.subscribe((set) => {
        emissionCount++;
        if (emissionCount === 1) {
          // Primeira emissão: sem claims (logout)
          expect(set.grants.size).toBe(0);
          // Simula login
          mockRbacService.setMockGrants(['tool.pip.read']);
          mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
        } else if (emissionCount === 2) {
          // Segunda emissão: após login
          expect(set.grants.size).toBeGreaterThan(0);
          done();
        }
      });

      // Dispara primeira emissão (sem claims)
      mockSessionSource.setClaims(null);
    });

    it('deve recomputar quando claims são removidas (logout)', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockContextSource.setContext({ tenantId: 'tenant1' });
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });

      let emissionCount = 0;
      service.permissions$.subscribe((set) => {
        emissionCount++;
        if (emissionCount === 1 && set.grants.size > 0) {
          // Primeira emissão: autenticado
          expect(set.grants.size).toBeGreaterThan(0);
          // Simula logout
          mockSessionSource.setClaims(null);
        } else if (emissionCount === 2) {
          // Segunda emissão: após logout
          expect(set.grants.size).toBe(0);
          done();
        }
      });
    });
  });

  describe('explain()', () => {
    beforeEach(() => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockContextSource.setContext({ tenantId: 'tenant1' });
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
    });

    it('deve retornar "granted" para permissão existente', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          const result = service.explain('tool.pip.read');
          expect(result.reasonCode).toBe('granted');
          expect(result.message).toContain('Permissão concedida');
          done();
        }
      });
    });

    it('deve retornar "missing-permission" para permissão inexistente', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          const result = service.explain('tool.pip.delete');
          expect(result.reasonCode).toBe('missing-permission');
          expect(result.message).toContain('não concedida');
          done();
        }
      });
    });

    it('deve retornar "invalid-key" para chave inválida', () => {
      const result = service.explain('invalid');
      expect(result.reasonCode).toBe('invalid-key');
      expect(result.message).toContain('inválida');
    });
  });

  describe('Helpers getAllGrants/getRoles/getContextKey', () => {
    beforeEach(() => {
      mockRbacService.setMockGrants(['tool.pip.read', 'tool.pip.write']);
      mockContextSource.setContext({ tenantId: 'tenant1' });
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['ADMIN', 'VIEWER'] });
    });

    it('getAllGrants() deve retornar todas as permissões como array', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          const grants = service.getAllGrants();
          expect(grants).toContain('tool.pip.read');
          expect(grants).toContain('tool.pip.write');
          expect(grants.length).toBe(2);
          done();
        }
      });
    });

    it('getRoles() deve retornar todas as roles', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          const roles = service.getRoles();
          expect(roles).toContain('ADMIN');
          expect(roles).toContain('VIEWER');
          done();
        }
      });
    });

    it('getContextKey() deve retornar chave de contexto atual', (done) => {
      service.permissions$.subscribe((set) => {
        if (set.grants.size > 0) {
          const key = service.getContextKey();
          expect(key).toContain('tenant1');
          done();
        }
      });
    });
  });
});

// ============================================================================
// permission.model utilities
// ============================================================================

describe('permission.model utilities', () => {
  describe('toPermissionSnapshot', () => {
    it('deve converter PermissionSetLite em PermissionSnapshot imutável', () => {
      const set: PermissionSetLite = {
        grants: new Set(['tool.pip.read', 'tool.pip.write']),
        roles: ['ADMIN', 'EDITOR'],
        resolvedAt: 1234567890,
        contextKey: 'tenant1|client1|project1|prod',
      };

      const snapshot = toPermissionSnapshot(set);

      expect(snapshot.grants).toEqual(['tool.pip.read', 'tool.pip.write']);
      expect(snapshot.roles).toEqual(['ADMIN', 'EDITOR']);
      expect(snapshot.resolvedAt).toBe(1234567890);
      expect(snapshot.contextKey).toBe('tenant1|client1|project1|prod');
    });

    it('deve criar snapshot com arrays independentes (imutabilidade)', () => {
      const originalRoles = ['ADMIN'];
      const set: PermissionSetLite = {
        grants: new Set(['tool.pip.read']),
        roles: originalRoles,
        resolvedAt: Date.now(),
        contextKey: 'test',
      };

      const snapshot = toPermissionSnapshot(set);

      // Modificar array original não deve afetar snapshot
      originalRoles.push('EDITOR');
      expect(snapshot.roles).toEqual(['ADMIN']);
    });

    it('deve lidar com grants vazios', () => {
      const set: PermissionSetLite = {
        grants: new Set(),
        roles: [],
        resolvedAt: Date.now(),
        contextKey: 'none',
      };

      const snapshot = toPermissionSnapshot(set);

      expect(snapshot.grants).toEqual([]);
      expect(snapshot.roles).toEqual([]);
    });
  });

  describe('isValidPermissionKeyFormat', () => {
    it('deve aceitar formato válido com 3 segmentos', () => {
      expect(isValidPermissionKeyFormat('tool.pip.read')).toBe(true);
      expect(isValidPermissionKeyFormat('tool.pip.write')).toBe(true);
      expect(isValidPermissionKeyFormat('system.user.manage')).toBe(true);
    });

    it('deve aceitar formato válido com mais de 3 segmentos', () => {
      expect(isValidPermissionKeyFormat('tool.pip.admin.delete')).toBe(true);
      expect(isValidPermissionKeyFormat('a.b.c.d.e')).toBe(true);
    });

    it('deve rejeitar chave com menos de 3 segmentos', () => {
      expect(isValidPermissionKeyFormat('tool.pip')).toBe(false);
      expect(isValidPermissionKeyFormat('tool')).toBe(false);
    });

    it('deve rejeitar chave vazia', () => {
      expect(isValidPermissionKeyFormat('')).toBe(false);
    });

    it('deve rejeitar chave null ou undefined', () => {
      expect(isValidPermissionKeyFormat(null as unknown as string)).toBe(false);
      expect(isValidPermissionKeyFormat(undefined as unknown as string)).toBe(false);
    });

    it('deve rejeitar tipo não-string', () => {
      expect(isValidPermissionKeyFormat(123 as unknown as string)).toBe(false);
      expect(isValidPermissionKeyFormat({ key: 'value' } as unknown as string)).toBe(false);
    });
  });

  describe('EMPTY_PERMISSION_SET', () => {
    it('deve ter grants vazios', () => {
      expect(EMPTY_PERMISSION_SET.grants.size).toBe(0);
    });

    it('deve ter roles vazios', () => {
      expect(EMPTY_PERMISSION_SET.roles).toEqual([]);
    });

    it('deve ter contextKey "none"', () => {
      expect(EMPTY_PERMISSION_SET.contextKey).toBe('none');
    });

    it('deve ter timestamp definido', () => {
      expect(EMPTY_PERMISSION_SET.resolvedAt).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// permission.adapters
// ============================================================================

describe('permission.adapters', () => {
  let mockRbacService: MockRbacService;

  beforeEach(() => {
    mockRbacService = new MockRbacService();
  });

  describe('adaptPermissionsFromRbac', () => {
    it('deve converter claims+context em PermissionSetLite corretamente', () => {
      mockRbacService.setMockGrants(['tool.pip.read', 'tool.pip.write']);

      const claims: ClaimsLite = {
        sessionId: 'user123',
        roles: ['ADMIN', 'EDITOR'],
      };

      const context: ContextLite = {
        tenantId: 'tenant1',
        clientId: 'client1',
        projectId: 'project1',
      };

      const result = adaptPermissionsFromRbac(
        mockRbacService as unknown as PermissionRbacService,
        { claims, context }
      );

      expect(result.grants.has('tool.pip.read')).toBe(true);
      expect(result.grants.has('tool.pip.write')).toBe(true);
      expect(result.roles).toEqual(['ADMIN', 'EDITOR']);
      expect(result.contextKey).toContain('tenant1');
      expect(result.resolvedAt).toBeGreaterThan(0);
    });

    it('deve retornar EMPTY_PERMISSION_SET quando claims é null', () => {
      const context: ContextLite = { tenantId: 'tenant1' };

      const result = adaptPermissionsFromRbac(
        mockRbacService as unknown as PermissionRbacService,
        { claims: null, context }
      );

      expect(result).toEqual(EMPTY_PERMISSION_SET);
    });

    it('deve retornar set vazio quando context é null', () => {
      const claims: ClaimsLite = {
        sessionId: 'user123',
        roles: ['VIEWER'],
      };

      const result = adaptPermissionsFromRbac(
        mockRbacService as unknown as PermissionRbacService,
        { claims, context: null }
      );

      expect(result.grants.size).toBe(0);
      expect(result.roles).toEqual(['VIEWER']);
      expect(result.contextKey).toBe('no-context');
    });

    it('deve retornar EMPTY_PERMISSION_SET quando rbacService lança erro', () => {
      mockRbacService.setShouldThrow(true);

      const claims: ClaimsLite = { sessionId: 'user123', roles: ['ADMIN'] };
      const context: ContextLite = { tenantId: 'tenant1' };

      // Spy console.warn para verificar log de erro
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      const result = adaptPermissionsFromRbac(
        mockRbacService as unknown as PermissionRbacService,
        { claims, context }
      );

      expect(result).toEqual(EMPTY_PERMISSION_SET);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('adaptPermissionsFromRbac: RBAC resolution failed, returning EMPTY_PERMISSION_SET'),
        expect.any(Error)
      );

       warnSpy.mockRestore();
    });

    it('deve usar timestamp customizado quando fornecido', () => {
      mockRbacService.setMockGrants(['tool.pip.read']);

      const claims: ClaimsLite = { sessionId: 'user123', roles: ['VIEWER'] };
      const context: ContextLite = { tenantId: 'tenant1' };
      const customTimestamp = 9999999999;

      const result = adaptPermissionsFromRbac(
        mockRbacService as unknown as PermissionRbacService,
        { claims, context, timestamp: customTimestamp }
      );

      expect(result.resolvedAt).toBe(customTimestamp);
    });

    it('deve usar Date.now() quando timestamp não é fornecido', () => {
      mockRbacService.setMockGrants(['tool.pip.read']);

      const claims: ClaimsLite = { sessionId: 'user123', roles: ['VIEWER'] };
      const context: ContextLite = { tenantId: 'tenant1' };

      const before = Date.now();
      const result = adaptPermissionsFromRbac(
        mockRbacService as unknown as PermissionRbacService,
        { claims, context }
      );
      const after = Date.now();

      expect(result.resolvedAt).toBeGreaterThanOrEqual(before);
      expect(result.resolvedAt).toBeLessThanOrEqual(after);
    });

    it('deve lidar com claims sem roles', () => {
      mockRbacService.setMockGrants([]);

      const claims: ClaimsLite = { sessionId: 'user123' };
      const context: ContextLite = { tenantId: 'tenant1' };

      const result = adaptPermissionsFromRbac(
        mockRbacService as unknown as PermissionRbacService,
        { claims, context }
      );

      expect(result.roles).toEqual([]);
    });
  });

  describe('adaptPermissionsForMultipleContexts', () => {
    it('deve retornar Map com PermissionSetLite para cada contexto', () => {
      mockRbacService.setMockGrants(['tool.pip.read']);

      const claims: ClaimsLite = { sessionId: 'user123', roles: ['VIEWER'] };
      const contexts: ContextLite[] = [
        { tenantId: 'tenant1' },
        { tenantId: 'tenant2' },
        { tenantId: 'tenant3' },
      ];

      const result = adaptPermissionsForMultipleContexts(
        mockRbacService as unknown as PermissionRbacService,
        claims,
        contexts
      );

      expect(result.size).toBe(3);
      expect(result.has('tenant1|||')).toBe(true);
      expect(result.has('tenant2|||')).toBe(true);
      expect(result.has('tenant3|||')).toBe(true);
    });

    it('deve retornar Map vazio quando claims é null', () => {
      const contexts: ContextLite[] = [{ tenantId: 'tenant1' }];

      const result = adaptPermissionsForMultipleContexts(
        mockRbacService as unknown as PermissionRbacService,
        null,
        contexts
      );

      expect(result.size).toBe(0);
    });

    it('deve retornar Map vazio quando array de contextos é vazio', () => {
      const claims: ClaimsLite = { sessionId: 'user123', roles: ['VIEWER'] };

      const result = adaptPermissionsForMultipleContexts(
        mockRbacService as unknown as PermissionRbacService,
        claims,
        []
      );

      expect(result.size).toBe(0);
    });

    it('deve processar cada contexto independentemente', () => {
      // Simularmodelo grants diferentes para cada contexto (em cenário real, RBAC poderia variar)
      const claims: ClaimsLite = { sessionId: 'user123', roles: ['ADMIN'] };
      const contexts: ContextLite[] = [
        { tenantId: 'tenant1' },
        { tenantId: 'tenant2' },
      ];

      // Para este teste, todos terão os mesmos grants (mock simples)
      mockRbacService.setMockGrants(['tool.pip.read', 'tool.pip.write']);

      const result = adaptPermissionsForMultipleContexts(
        mockRbacService as unknown as PermissionRbacService,
        claims,
        contexts
      );

      const set1 = result.get('tenant1|||');
      const set2 = result.get('tenant2|||');

      expect(set1).toBeDefined();
      expect(set2).toBeDefined();
      expect(set1?.grants.size).toBe(2);
      expect(set2?.grants.size).toBe(2);
    });
  });
});

// ============================================================================
// permission.resolver
// ============================================================================

describe('permission.resolver', () => {
  let mockSessionSource: MockSessionSource;
  let mockContextSource: MockContextSource;
  let mockRbacService: MockRbacService;

  beforeEach(() => {
    mockSessionSource = new MockSessionSource();
    mockContextSource = new MockContextSource();
    mockRbacService = new MockRbacService();
  });

  describe('createPermissionResolver', () => {
    it('deve emitir quando claims mudam', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      
      // Aguarda próxima emissão após mudança de claims
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
      mockContextSource.setContext({ tenantId: 'tenant1' });

      const resolver = createPermissionResolver({
        rbacService: mockRbacService as unknown as PermissionRbacService,
        sessionSource: mockSessionSource,
        contextSource: mockContextSource,
      });

      resolver.pipe(take(1)).subscribe((set) => {
        // Primeira emissão após subscribe com claims já definidas
        expect(set.grants.size).toBeGreaterThan(0);
        expect(set.grants.has('tool.pip.read')).toBe(true);
        done();
      });
    });

    it('deve emitir quando context muda', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
      mockContextSource.setContext({ tenantId: 'tenant1' });

      const resolver = createPermissionResolver({
        rbacService: mockRbacService as unknown as PermissionRbacService,
        sessionSource: mockSessionSource,
        contextSource: mockContextSource,
      });

      let emissionCount = 0;
      resolver.pipe(take(2)).subscribe({
        next: (set) => {
          emissionCount++;
          if (emissionCount === 1) {
            // Primeira emissão: tenant1
            expect(set.contextKey).toContain('tenant1');
            // Muda context
            mockContextSource.setContext({ tenantId: 'tenant2' });
          } else if (emissionCount === 2) {
            // Segunda emissão: tenant2
            expect(set.contextKey).toContain('tenant2');
            done();
          }
        },
      });
    });

    it('deve usar distinctUntilChanged para evitar emissões redundantes', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
      mockContextSource.setContext({ tenantId: 'tenant1' });

      const resolver = createPermissionResolver({
        rbacService: mockRbacService as unknown as PermissionRbacService,
        sessionSource: mockSessionSource,
        contextSource: mockContextSource,
      });

      let emissionCount = 0;
      const subscription = resolver.subscribe((set) => {
        emissionCount++;
        if (emissionCount === 1) {
          // Primeira emissão com tenant1
          expect(set.contextKey).toContain('tenant1');
          // Emite novamente com mesmo contexto (deveria ser filtrado por distinctUntilChanged)
          mockContextSource.setContext({ tenantId: 'tenant1' });
          // Pequeno delay para permitir propagate; depois verificamos se não houve nova emissão
          setTimeout(() => {
            expect(emissionCount).toBe(1);
            subscription.unsubscribe();
            done();
          }, 0);
        } else if (emissionCount > 1) {
          // Se chegar aqui, distinctUntilChanged não funcionou
          subscription.unsubscribe();
          done.fail('distinctUntilChanged não filtrou emissão redundante');
        }
      });
    });

    it('deve usar shareReplay para compartilhar último valor entre subscribers', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
      mockContextSource.setContext({ tenantId: 'tenant1' });

      const resolver = createPermissionResolver({
        rbacService: mockRbacService as unknown as PermissionRbacService,
        sessionSource: mockSessionSource,
        contextSource: mockContextSource,
      });

      // Primeiro subscriber
      resolver.pipe(take(1)).subscribe((set1) => {
        expect(set1.grants.size).toBeGreaterThan(0);

        // Segundo subscriber (deve receber último valor imediatamente via shareReplay)
        resolver.pipe(take(1)).subscribe((set2) => {
          expect(set2.contextKey).toBe(set1.contextKey);
          expect(set2.grants.size).toBe(set1.grants.size);
          done();
        });
      });
    });
  });

  describe('createPermissionResolverWithTelemetry', () => {
    it('deve chamar telemetryFn quando habilitado', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
      mockContextSource.setContext({ tenantId: 'tenant1' });

      const telemetryEvents: PermissionResolveEvent[] = [];
      const telemetryFn = (event: PermissionResolveEvent) => {
        telemetryEvents.push(event);
      };

      const resolver = createPermissionResolverWithTelemetry({
        rbacService: mockRbacService as unknown as PermissionRbacService,
        sessionSource: mockSessionSource,
        contextSource: mockContextSource,
        telemetryFn,
      });

      resolver.pipe(take(1)).subscribe((set) => {
        expect(set.grants.size).toBeGreaterThan(0);
        expect(telemetryEvents.length).toBeGreaterThan(0);
        const event = telemetryEvents[0];
        expect(event.event).toBe('permissions.resolved');
        expect(event.contextKey).toContain('tenant1');
        expect(event.grantCount).toBe(1);
        expect(event.roleCount).toBe(1);
        expect(event.duration).toBeDefined();
        expect(event.timestamp).toBeDefined();
        done();
      });
    });

    it('não deve quebrar quando telemetryFn é undefined', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
      mockContextSource.setContext({ tenantId: 'tenant1' });

      const resolver = createPermissionResolverWithTelemetry({
        rbacService: mockRbacService as unknown as PermissionRbacService,
        sessionSource: mockSessionSource,
        contextSource: mockContextSource,
        telemetryFn: undefined,
      });

      resolver.pipe(take(1)).subscribe((set) => {
        expect(set.grants.size).toBeGreaterThan(0);
        done();
      });
    });

    it('telemetria não deve conter dados sensíveis', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockSessionSource.setClaims({
        sessionId: 'user123',
        roles: ['VIEWER'],
      });
      mockContextSource.setContext({ tenantId: 'tenant1' });

      const telemetryEvents: PermissionResolveEvent[] = [];
      const telemetryFn = (event: PermissionResolveEvent) => {
        telemetryEvents.push(event);
      };

      const resolver = createPermissionResolverWithTelemetry({
        rbacService: mockRbacService as unknown as PermissionRbacService,
        sessionSource: mockSessionSource,
        contextSource: mockContextSource,
        telemetryFn,
      });

      resolver.pipe(take(1)).subscribe(() => {
        const event = telemetryEvents[0];
        const eventString = JSON.stringify(event);

        // Verifica que não contém dados sensíveis
        expect(eventString).not.toContain('user123');
        expect(eventString).not.toContain('sessionId');

        // Verifica que contém apenas metadados seguros
        expect(event.contextKey).toBeDefined();
        expect(event.grantCount).toBeDefined();
        expect(event.roleCount).toBeDefined();
        done();
      });
    });
  });
});

// ============================================================================
// PermissionService - Integration Tests
// ============================================================================

describe('PermissionService - Integration Tests', () => {
  let service: PermissionService;
  let mockSessionSource: MockSessionSource;
  let mockContextSource: MockContextSource;
  let mockRbacService: MockRbacService;

  beforeEach(() => {
    mockSessionSource = new MockSessionSource();
    mockContextSource = new MockContextSource();
    mockRbacService = new MockRbacService();

    service = new PermissionService(
      mockRbacService as unknown as PermissionRbacService,
      mockSessionSource,
      mockContextSource
    );
  });

  describe('Fluxo completo: login → setContext → permissions', () => {
    it('deve resolver permissões após login e definir contexto', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read', 'tool.pip.write', 'tool.analytics.read']);

      let emissionCount = 0;
      service.permissions$.subscribe((set) => {
        emissionCount++;

        if (emissionCount === 1) {
          // Primeira emissão: sem sessão/contexto
          expect(set.grants.size).toBe(0);

          // Simula login
          mockSessionSource.setClaims({
            sessionId: 'user123',
            roles: ['ADMIN', 'PIP_EDITOR'],
          });
        } else if (emissionCount === 2) {
          // Segunda emissão: após login, mas sem contexto ainda
          // Define contexto
          mockContextSource.setContext({
            tenantId: 'tenant1',
            clientId: 'client1',
            projectId: 'project1',
          });
        } else if (emissionCount === 3) {
          // Terceira emissão: após contexto definido
          expect(set.grants.size).toBe(3);
          expect(set.grants.has('tool.pip.read')).toBe(true);
          expect(set.grants.has('tool.pip.write')).toBe(true);
          expect(set.grants.has('tool.analytics.read')).toBe(true);
          expect(set.roles).toEqual(['ADMIN', 'PIP_EDITOR']);
          expect(set.contextKey).toContain('tenant1');

          // Valida helpers
          expect(service.has('tool.pip.read')).toBe(true);
          expect(service.canAny(['tool.pip.read', 'tool.pip.delete'])).toBe(true);
          expect(service.canAll(['tool.pip.read', 'tool.pip.write'])).toBe(true);
          expect(service.canAll(['tool.pip.read', 'tool.pip.delete'])).toBe(false);

          done();
        }
      });
    });
  });

  describe('Fluxo logout → clear context → EMPTY_PERMISSION_SET', () => {
    it('deve limpar permissões após logout', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
      mockContextSource.setContext({ tenantId: 'tenant1' });

      // Primeira verificação: permissões carregadas
      service.permissions$.pipe(take(1)).subscribe((set) => {
        expect(set.grants.has('tool.pip.read')).toBe(true);
        expect(service.has('tool.pip.read')).toBe(true);

        // Simula logout
        mockSessionSource.setClaims(null);

        // Segunda verificação: permissões limpas
        service.permissions$.pipe(take(1)).subscribe((setAfterLogout) => {
          expect(setAfterLogout.grants.size).toBe(0);
          expect(service.has('tool.pip.read')).toBe(false);
          done();
        });
      });
    });
  });

  describe('Switch context mantém sessão e recomputa perms', () => {
    it('deve recomputar permissões ao trocar contexto sem perder sessão', (done) => {
      mockRbacService.setMockGrants(['tool.pip.read']);
      mockSessionSource.setClaims({ sessionId: 'user123', roles: ['VIEWER'] });
      mockContextSource.setContext({ tenantId: 'tenant1' });

      let emissionCount = 0;
      service.permissions$.subscribe((set) => {
        emissionCount++;

        if (emissionCount === 1 && set.grants.size > 0) {
          // Contexto inicial
          expect(set.contextKey).toContain('tenant1');
          expect(set.roles).toEqual(['VIEWER']);

          // Troca contexto
          mockContextSource.setContext({ tenantId: 'tenant2' });
        } else if (emissionCount === 2) {
          // Novo contexto
          expect(set.contextKey).toContain('tenant2');
          expect(set.roles).toEqual(['VIEWER']); // Sessão mantida
          expect(set.grants.has('tool.pip.read')).toBe(true);

          done();
        }
      });
    });
  });
});

// ============================================================================
