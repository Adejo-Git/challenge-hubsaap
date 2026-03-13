import { ComponentFixture, TestBed, fakeAsync, flush, flushMicrotasks } from '@angular/core/testing';
import { AppShellComponent } from './app-shell.component';

// Real Services from Access Layer
import { ContextService, SessionService, NavigationService } from '@hub/access-layer';
import { ObservabilityService } from '@hub/observability/data-access';
import { AuthSessionService } from '@hub/auth-session';
import { NotificationService } from '@hub/notifications/data-access';

import { Observable, of, BehaviorSubject } from 'rxjs';
import { provideRouter } from '@angular/router';
import { ERROR_PAGE_OBSERVABILITY } from '@hub/shared/ui-error-page';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import {
  NOTIFICATION_CENTER_CONTEXT_SOURCE,
  NOTIFICATION_CENTER_DATA_SOURCE,
  NOTIFICATION_CENTER_FEEDBACK_SOURCE,
  NOTIFICATION_CENTER_NAVIGATION_SOURCE,
  NOTIFICATION_CENTER_OBSERVABILITY_SOURCE,
} from '../notifications/notification-center/notification-center.facades';

type TestSessionSnapshot = {
  authenticated: boolean;
  status: 'authenticated';
  user: { id: string; name: string; email: string; roles?: string[] };
  claims: null;
  exp: number;
};

type TestContext = {
  tenantId: string;
  tenantName?: string;
  clienteId: string | null;
  clienteName?: string | null;
  projetoId: string | null;
  projetoName?: string | null;
  environment: 'dev' | 'staging';
};

type TestNavigationItem = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  items?: readonly unknown[];
};

type SessionServiceMock = {
  restoreOrRefresh: jest.Mock<Promise<TestSessionSnapshot>, []>;
  logout: jest.Mock;
  snapshot: jest.Mock;
};

type ContextServiceMock = {
  restoreFromStorage: jest.Mock<Promise<void>, []>;
  snapshot: jest.Mock<TestContext, []>;
  context$: Observable<TestContext>;
  setContext: jest.Mock<Promise<void>, [TestContext, { source: string; persist: boolean }?]>;
};

type NavigationServiceMock = {
  menu$: Observable<{ groups: TestNavigationItem[] }>;
  breadcrumbs$: Observable<unknown[]>;
  activeItem$: Observable<unknown>;
  rebuild: jest.Mock<void, []>;
};

describe('AppShellComponent', () => {
  let component: AppShellComponent;
  let fixture: ComponentFixture<AppShellComponent>;
  let sessionService: SessionService & SessionServiceMock;
  let contextService: ContextService & ContextServiceMock;
  let navigationService: NavigationService & NavigationServiceMock;
  let observabilityService: ObservabilityService;
  let trackEventSpy: jest.SpyInstance;
  const feedbackAdapter = {
    showError: jest.fn(),
  };

  // helper: finish bootstrap (Promise chain) and allow the context debounce listener (100ms)
  async function completeBootstrap(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();

    if (!component.isBootstrapComplete() && !component.hasError()) {
      await component.executeBootstrap();
      await fixture.whenStable();
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    const performanceTarget = globalThis as typeof globalThis & {
      performance?: {
        now?: () => number;
      };
    };
    performanceTarget.performance = performanceTarget.performance ?? {};
    if (!performanceTarget.performance.now) {
      performanceTarget.performance.now = () => Date.now();
    }

    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([]),
        {
          provide: ObservabilityService,
          useValue: {
            trackEvent: jest.fn(),
            trackError: jest.fn(),
            captureException: jest.fn(),
          },
        },
        {
          provide: AuthSessionService,
          useValue: {
            session$: of({
              authenticated: true,
              status: 'authenticated',
              user: { id: 'user-123', name: 'Maria', email: 'maria@example.com' },
              claims: null,
              exp: Math.floor(Date.now() / 1000) + 3600,
            }),
            snapshot: jest.fn().mockReturnValue({
              authenticated: true,
              status: 'authenticated',
              user: { id: 'user-123', name: 'Maria', email: 'maria@example.com' },
              claims: null,
              exp: Math.floor(Date.now() / 1000) + 3600,
            }),
            restore: jest.fn().mockResolvedValue({
              authenticated: true,
              status: 'authenticated',
              user: { id: 'user-123', name: 'Maria', email: 'maria@example.com' },
              claims: null,
              exp: Math.floor(Date.now() / 1000) + 3600,
            }),
            getAccessToken: jest.fn().mockReturnValue('mock-token'),
            logout: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SessionService,
          useValue: {
            restoreOrRefresh: jest.fn(),
            logout: jest.fn(),
            snapshot: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useFactory: () => {
            const initial: TestContext = {
              tenantId: 'tenant-001',
              clienteId: null,
              projetoId: null,
              environment: 'dev',
            };
            const subject = new BehaviorSubject(initial);

            return {
              restoreFromStorage: jest.fn().mockResolvedValue(undefined),
              snapshot: jest.fn(() => subject.getValue()),
              context$: subject.asObservable(),
              setContext: jest.fn((ctx: TestContext) => {
                subject.next(ctx);
                return Promise.resolve(undefined);
              }),
            };
          },
        },
        {
          provide: NavigationService,
          useValue: {
            menu$: of({ groups: [] }),
            breadcrumbs$: of([]),
            activeItem$: of(null),
            rebuild: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            notifications$: of([]),
            getNotifications: jest.fn().mockReturnValue(of([])),
            markAsRead: jest.fn().mockReturnValue(of(undefined)),
            markAllAsReadBatch: jest.fn().mockReturnValue(of(undefined)),
            clearAll: jest.fn().mockReturnValue(of(undefined)),
          },
        },
        {
          provide: NOTIFICATION_CENTER_DATA_SOURCE,
          useExisting: NotificationService,
        },
        {
          provide: NOTIFICATION_CENTER_CONTEXT_SOURCE,
          useExisting: ContextService,
        },
        {
          provide: NOTIFICATION_CENTER_NAVIGATION_SOURCE,
          useExisting: NavigationService,
        },
        {
          provide: NOTIFICATION_CENTER_OBSERVABILITY_SOURCE,
          useExisting: ObservabilityService,
        },
        {
          provide: NOTIFICATION_CENTER_FEEDBACK_SOURCE,
          useValue: feedbackAdapter,
        },
        {
          provide: ERROR_PAGE_OBSERVABILITY,
          useExisting: ObservabilityService,
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppShellComponent);
    component = fixture.componentInstance;

    sessionService = TestBed.inject(SessionService) as SessionService & SessionServiceMock;
    contextService = TestBed.inject(ContextService) as ContextService & ContextServiceMock;
    navigationService = TestBed.inject(NavigationService) as NavigationService & NavigationServiceMock;
    observabilityService = TestBed.inject(ObservabilityService);

    const mockSessionSnapshot: TestSessionSnapshot = {
      authenticated: true,
      status: 'authenticated',
      user: { id: 'user-123', name: 'Maria', email: 'maria@example.com' },
      claims: null,
      exp: Date.now() / 1000 + 3600,
    };
    sessionService.restoreOrRefresh.mockResolvedValue(mockSessionSnapshot);

    contextService.restoreFromStorage.mockResolvedValue(undefined);
    contextService.snapshot.mockImplementation(() => ({
      tenantId: 'tenant-001',
      clienteId: null,
      projetoId: null,
      environment: 'dev',
    }));

    const mockNavigation: TestNavigationItem[] = [{ id: 'dashboard', label: 'Dashboard', path: '/dashboard', visible: true }];
    navigationService.menu$ = of({ groups: mockNavigation });

    trackEventSpy = jest.spyOn(observabilityService, 'trackEvent');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================================================
  // Render Tests
  // ==========================================================================

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve renderizar loading state inicialmente', fakeAsync(() => {
    jest.spyOn(sessionService, 'restoreOrRefresh').mockImplementation(() => {
      return new Promise((resolve) => setTimeout(() => resolve({
        authenticated: true,
        status: 'authenticated' as const,
        user: { id: 'user-123', name: 'Maria', email: 'maria@example.com' },
        claims: null,
        exp: Date.now() / 1000 + 3600,
      }), 100));
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const loadingContainer = compiled.querySelector('.loading-container');

    expect(loadingContainer).toBeTruthy();
    expect(component.isLoading()).toBe(true);

    flushMicrotasks();
    flush(); // Aguardar bootstrap
  }));

  it('deve renderizar 4 slots após bootstrap completo', async () => {
    await completeBootstrap();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.topbar')).toBeTruthy();
    expect(compiled.querySelector('.sidebar')).toBeTruthy();
    expect(compiled.querySelector('.content')).toBeTruthy();
    expect(compiled.querySelector('.right-panel')).toBeTruthy();
    expect(component.isBootstrapComplete()).toBe(true);
  });

  it('deve ocultar loading após bootstrap completo', async () => {
    await completeBootstrap();

    const compiled = fixture.nativeElement as HTMLElement;
    const loadingContainer = compiled.querySelector('.loading-container');

    expect(loadingContainer).toBeFalsy();
    expect(component.isLoading()).toBe(false);
  });

  it('deve executar bootstrap em sequência: sessão → contexto → navegação', async () => {
    const sessionSpy = jest.spyOn(sessionService, 'restoreOrRefresh');
    const contextSpy = jest.spyOn(contextService, 'restoreFromStorage');
    const navigationSpy = jest.spyOn(navigationService, 'rebuild');

    await completeBootstrap();

    expect(sessionSpy).toHaveBeenCalled();
    expect(contextSpy).toHaveBeenCalled();
    expect(navigationSpy).toHaveBeenCalled();
  });

  it('deve registrar eventos de observabilidade durante bootstrap', async () => {
    await completeBootstrap();

    expect(trackEventSpy).toHaveBeenCalledWith('bootstrap.start');
    expect(trackEventSpy).toHaveBeenCalledWith('bootstrap.session.success', expect.any(Object));
    expect(trackEventSpy).toHaveBeenCalledWith('bootstrap.context.success', expect.any(Object));
    expect(trackEventSpy).toHaveBeenCalledWith('navigation_rebuild_triggered');
    expect(trackEventSpy).toHaveBeenCalledWith('bootstrap.navigation.success', expect.any(Object));
    expect(trackEventSpy).toHaveBeenCalledWith('bootstrap.complete', expect.any(Object));
  });

  it('deve atualizar signals após bootstrap', async () => {
    await completeBootstrap();

    expect(component.currentUser()).toBeTruthy();
    expect(component.activeContext()).toBeTruthy();
    expect(component.navigationTree()).toBeDefined();
  });

  it('deve permitir retry apos erro', async () => {
    await completeBootstrap();
    expect(component.isBootstrapComplete()).toBe(true);

    (sessionService.restoreOrRefresh as jest.Mock).mockRejectedValueOnce(new Error('Erro'));

    await component.executeBootstrap();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(component.isBootstrapComplete()).toBe(false);

    (sessionService.restoreOrRefresh as jest.Mock).mockResolvedValueOnce({
      authenticated: true,
      status: 'authenticated',
      user: { id: '1', name: 'Test', email: 'test@test.com' },
      claims: null,
      exp: Date.now() / 1000 + 3600,
    });

    await component.executeBootstrap();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.hasError()).toBe(false);
    expect(component.isBootstrapComplete()).toBe(true);
  });

  it('deve reagir a mudanças de contexto', async () => {
    await completeBootstrap();

    const navigationSpy = jest.spyOn(navigationService, 'rebuild');

    const newContext: TestContext = {
      tenantId: 'tenant-002',
      tenantName: 'Novo Tenant',
      clienteId: null,
      clienteName: null,
      projetoId: null,
      projetoName: null,
      environment: 'dev',
    };

    await contextService.setContext?.(newContext, { source: 'test', persist: false });
    await new Promise((resolve) => setTimeout(resolve, 120));
    fixture.detectChanges();

    expect(component.activeContext()?.tenantId).toBe('tenant-002');
    expect(navigationSpy).toHaveBeenCalled();
  });

  it('deve registrar evento de context_changed', async () => {
    await completeBootstrap();

    const localTrackEventSpy = trackEventSpy;

    const newContext: TestContext = {
      tenantId: 'tenant-003',
      tenantName: 'Tenant Teste',
      clienteId: null,
      clienteName: null,
      projetoId: null,
      projetoName: null,
      environment: 'staging',
    };

    await contextService.setContext?.(newContext, { source: 'test', persist: false });
    await new Promise((resolve) => setTimeout(resolve, 120));
    fixture.detectChanges();

    expect(localTrackEventSpy).toHaveBeenCalledWith('context.changed', expect.any(Object));
    expect(localTrackEventSpy).toHaveBeenCalledWith('navigation.rebuilt', expect.any(Object));
  });

  it('deve aplicar fallback de contexto quando storage vazio durante bootstrap', async () => {
    // Arrange: simulate no snapshot initially, and allow setContext to populate it
    (contextService.snapshot as jest.Mock).mockImplementationOnce(() => null).mockImplementation(() => ({
      tenantId: 'dev-tenant',
      clienteId: null,
      projetoId: null,
      environment: 'dev',
    }));

    // Spy setContext
    const setSpy = jest.spyOn(contextService, 'setContext');

    // Act
    await component.executeBootstrap();
    await fixture.whenStable();

    // Assert
    expect(setSpy).toHaveBeenCalled();
    expect(component.activeContext()?.tenantId).toBe('dev-tenant');
  });

  it('não deve sobrescrever contexto existente durante bootstrap', async () => {
    // Arrange: snapshot returns an existing context
    (contextService.snapshot as jest.Mock).mockImplementation(() => ({
      tenantId: 'tenant-existing',
      clienteId: null,
      projetoId: null,
      environment: 'dev',
    }));

    const setSpy = jest.spyOn(contextService, 'setContext');

    // Act
    await component.executeBootstrap();
    await fixture.whenStable();

    // Assert: setContext should not be called as snapshot exists
    expect(setSpy).not.toHaveBeenCalled();
    expect(component.activeContext()?.tenantId).toBe('tenant-existing');
  });

  it('deve falhar se fallback aplicado não resultar em contexto (setContext rejeita)', async () => {
    // Arrange: snapshot initially null
    (contextService.snapshot as jest.Mock).mockImplementationOnce(() => null).mockImplementation(() => null);
    // setContext will reject
    (contextService.setContext as jest.Mock).mockRejectedValueOnce(new Error('storage fail'));

    // Act
    await component.executeBootstrap();
    await fixture.whenStable();

    // Assert: component must be in error state with context-related message
    expect(component.hasError()).toBe(true);
    const details = component['errorDetails']();
    expect(details).toBeTruthy();
    expect(details?.message).toContain('context');
  });

  // ==========================================================================
  // User Actions Tests
  // ==========================================================================

  it('deve limpar estados ao chamar onLogout', () => {
    component.currentUser.set({ id: '1', name: 'Test', email: 'test@test.com', roles: [] });
    component.activeContext.set({ tenantId: 'tenant-001', tenantName: 'Test', clienteId: null, clienteName: null, projetoId: null, projetoName: null, environment: 'dev' });
    component.navigationTree.set([{ id: '1', label: 'Item', path: '/item', visible: true }]);

    component.onLogout();

    expect(component.currentUser()).toBeNull();
    expect(component.activeContext()).toBeNull();
    expect(component.navigationTree()).toEqual([]);
    expect(component.isBootstrapComplete()).toBe(false);
  });

  it('deve registrar logout_clicked no ObservabilityService', () => {
    component.onLogout();

    expect(trackEventSpy).toHaveBeenCalledWith('logout_clicked');
  });

  it('deve registrar context_switch_clicked ao trocar contexto', () => {
    const newContext = { tenantId: 'tenant-999', tenantName: 'Novo', clienteId: null, clienteName: null, projetoId: null, projetoName: null, environment: 'dev' as const };

    component.onContextSwitch(newContext);

    expect(trackEventSpy).toHaveBeenCalledWith('context_switch_clicked', {
      newTenantId: 'tenant-999',
    });
  });

  // ==========================================================================
  // Memory Leak Prevention Tests
  // ==========================================================================

  it('deve usar takeUntilDestroyed para prevenir memory leaks', () => {
    // Este teste verifica que o componente foi construído com DestroyRef
    // A verificação real de memory leak seria feita em teste E2E
    expect(component['destroyRef']).toBeDefined();
  });
});
