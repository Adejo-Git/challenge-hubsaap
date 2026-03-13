/**
 * Testes unitários do ToolContextAdapter
 * 
 * Cenários cobertos:
 * - Snapshot inicial consistente
 * - Propagação de troca de contexto
 * - Atualização de capabilities por mudança de flags/decisão
 * - Modo degradado (fallback) quando serviços não estão disponíveis
 */

import { BehaviorSubject, of } from 'rxjs';

import { ToolContextAdapter } from './tool-context-adapter';
import {
  ISessionService,
  IContextService,
  IFeatureFlagService,
  IAccessDecisionService,
  ISession,
  IAppContext,
} from './tool-context-adapter.service.interfaces';
import { ToolContext } from './tool-context.model';

describe('ToolContextAdapter', () => {
  // Mocks dos serviços
  let mockSessionService: Partial<ISessionService>;
  let mockContextService: Partial<IContextService>;
  let mockFeatureFlagService: Partial<IFeatureFlagService>;
  let mockAccessDecisionService: Partial<IAccessDecisionService>;

  // Subjects para simular streams reativos
  let sessionSubject: BehaviorSubject<ISession | null>;
  let contextSubject: BehaviorSubject<IAppContext>;

  const createMockSession = (): ISession => ({
    user: {
      id: 'user-123',
      name: 'João Silva',
      email: 'joao@example.com',
      roles: ['user', 'admin'],
    },
    token: 'mock-token-abc',
    expiresAt: new Date(Date.now() + 3600000),
  });

  const createMockContext = (): IAppContext => ({
    tenantId: 'tenant-001',
    tenantName: 'Empresa Demo',
    clienteId: 'client-abc',
    clienteName: 'Cliente Alpha',
    projetoId: 'project-xyz',
    projetoName: 'Projeto Beta',
    environment: 'dev',
  });

  beforeEach(() => {
    // Inicializa subjects
    sessionSubject = new BehaviorSubject<ISession | null>(createMockSession());
    contextSubject = new BehaviorSubject<IAppContext>(createMockContext());

    // Cria mocks dos serviços
    mockSessionService = {
      getCurrentSession: jest.fn().mockReturnValue(createMockSession()),
      isAuthenticated: jest.fn().mockReturnValue(true),
      session$: sessionSubject.asObservable(),
    };

    mockContextService = {
      getActiveContext: jest.fn().mockReturnValue(createMockContext()),
      contextChange$: contextSubject.asObservable(),
    };

    mockFeatureFlagService = {
      isToolEnabled: jest.fn().mockReturnValue(true),
      isFeatureEnabled: jest.fn().mockReturnValue(true),
      getActiveFlags: jest.fn().mockReturnValue(of(['feature-a', 'feature-b'])),
    };

    mockAccessDecisionService = {
      canAccessTool: jest.fn().mockReturnValue(true),
      getUserCapabilities: jest.fn().mockReturnValue(of(['action-view', 'action-edit'])),
    };
  });

  it('deve ser criado corretamente', () => {
    const service = new ToolContextAdapter(
      mockSessionService as ISessionService,
      mockContextService as IContextService,
      mockFeatureFlagService as IFeatureFlagService,
      mockAccessDecisionService as IAccessDecisionService
    );
    expect(service).toBeTruthy();
  });

  it('deve retornar snapshot inicial consistente', (done) => {
    const service = new ToolContextAdapter(
      mockSessionService as ISessionService,
      mockContextService as IContextService,
      mockFeatureFlagService as IFeatureFlagService,
      mockAccessDecisionService as IAccessDecisionService
    );

    // Aguarda inicialização
    setTimeout(() => {
      const snapshot = service.contextSnapshot();

      expect(snapshot).toBeTruthy();
      expect(snapshot && snapshot.context && snapshot.context.session && snapshot.context.session.userId).toBe('user-123');
      expect(snapshot && snapshot.context && snapshot.context.tenantId).toBe('tenant-001');
      expect(snapshot && snapshot.context && snapshot.context.clientId).toBe('client-abc');
      expect(snapshot && snapshot.context && snapshot.context.projectId).toBe('project-xyz');
      expect(snapshot && snapshot.capabilities && snapshot.capabilities.isToolEnabled).toBe(true);

      done();
    }, 100);
  });

  it('deve propagar troca de contexto reativamente', (done) => {
    const service = new ToolContextAdapter(
      mockSessionService as ISessionService,
      mockContextService as IContextService,
      mockFeatureFlagService as IFeatureFlagService,
      mockAccessDecisionService as IAccessDecisionService
    );

    let emissionCount = 0;
    const contextValues: (ToolContext | null)[] = [];

    service.toolContext$.subscribe((context) => {
      contextValues.push(context);
      emissionCount++;

      if (emissionCount === 2) {
        // Primeira emissão: contexto inicial
        expect(contextValues[0]?.tenantId).toBe('tenant-001');

        // Segunda emissão: contexto atualizado
        expect(contextValues[1]?.tenantId).toBe('tenant-002');
        expect(contextValues[1]?.clientId).toBe('client-new');

        done();
      }
    });

    // Simula troca de contexto
    setTimeout(() => {
      const newContext: IAppContext = {
        tenantId: 'tenant-002',
        tenantName: 'Nova Empresa',
        clienteId: 'client-new',
        clienteName: 'Novo Cliente',
        projetoId: null,
        projetoName: null,
        environment: 'staging',
      };
      contextSubject.next(newContext);
    }, 50);
  });

  it('deve detectar tipo de mudança corretamente', (done) => {
    const service = new ToolContextAdapter(
      mockSessionService as ISessionService,
      mockContextService as IContextService,
      mockFeatureFlagService as IFeatureFlagService,
      mockAccessDecisionService as IAccessDecisionService
    );

    let changeCount = 0;

    service.contextChange$.subscribe((change) => {
      if (change && changeCount > 0) {
        expect(change.changeType).toBe('tenant');
        expect(change.current.tenantId).toBe('tenant-002');
        done();
      }
      changeCount++;
    });

    // Simula troca de tenant
    setTimeout(() => {
      const newContext: IAppContext = {
        ...createMockContext(),
        tenantId: 'tenant-002',
        tenantName: 'Novo Tenant',
      };
      contextSubject.next(newContext);
    }, 50);
  });

  it('deve atualizar capabilities quando flags mudam', (done) => {
    const service = new ToolContextAdapter(
      mockSessionService as ISessionService,
      mockContextService as IContextService,
      mockFeatureFlagService as IFeatureFlagService,
      mockAccessDecisionService as IAccessDecisionService
    );

    setTimeout(() => {
      const snapshot = service.contextSnapshot('tax-map');

      expect(snapshot).toBeTruthy();
      expect(mockFeatureFlagService.isToolEnabled).toHaveBeenCalledWith('tax-map');

      done();
    }, 100);
  });

  it('deve funcionar em modo degradado sem serviços injetados', (done) => {
    const service = new ToolContextAdapter();

    setTimeout(() => {
      const snapshot = service.contextSnapshot();

      expect(snapshot).toBeTruthy();
      expect(snapshot && snapshot.context && snapshot.context.session && snapshot.context.session.userId).toBe('fallback-user');
      expect(snapshot && snapshot.context && snapshot.context.tenantId).toBe('fallback-tenant');
      expect(snapshot && snapshot.capabilities && snapshot.capabilities.isToolEnabled).toBe(true);

      done();
    }, 100);
  });

  it('deve expor toolContext$ como stream reativo', (done) => {
    const service = new ToolContextAdapter(
      mockSessionService as ISessionService,
      mockContextService as IContextService,
      mockFeatureFlagService as IFeatureFlagService,
      mockAccessDecisionService as IAccessDecisionService
    );

    service.toolContext$.subscribe((context) => {
      if (context) {
        expect(context.session).toBeTruthy();
        expect(context.tenantId).toBe('tenant-001');
        done();
      }
    });
    expect(service.toolContext$ && typeof service.toolContext$.subscribe === 'function').toBe(true);
  });

  it('deve expor capabilities$ como stream reativo', (done) => {
    const service = new ToolContextAdapter(
      mockSessionService as ISessionService,
      mockContextService as IContextService,
      mockFeatureFlagService as IFeatureFlagService,
      mockAccessDecisionService as IAccessDecisionService
    );

    service.capabilities$.subscribe((capabilities) => {
      if (capabilities) {
        expect(capabilities.isToolEnabled).toBe(true);
        expect(capabilities.enabledFeatures.length).toBeGreaterThan(0);
        done();
      }
    });
    expect(service.capabilities$ && typeof service.capabilities$.subscribe === 'function').toBe(true);
  });

  it('deve permitir refresh manual de capabilities', () => {
    const service = new ToolContextAdapter(
      mockSessionService as ISessionService,
      mockContextService as IContextService,
      mockFeatureFlagService as IFeatureFlagService,
      mockAccessDecisionService as IAccessDecisionService
    );

    service.refreshCapabilities('tax-map');

    expect(mockFeatureFlagService.isToolEnabled).toHaveBeenCalledWith('tax-map');
  });
});
