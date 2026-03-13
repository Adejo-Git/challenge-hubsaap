import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Subject, Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { provideRouter } from '@angular/router';
import { NotificationCenterComponent } from './notification-center.component';
import { NotificationFeedItem } from './notification.model';
import {
  NOTIFICATION_CENTER_CONTEXT_SOURCE,
  NOTIFICATION_CENTER_DATA_SOURCE,
  NOTIFICATION_CENTER_FEEDBACK_SOURCE,
  NOTIFICATION_CENTER_NAVIGATION_SOURCE,
  NOTIFICATION_CENTER_OBSERVABILITY_SOURCE,
  NotificationCenterContextSource,
  NotificationCenterDataSource,
  NotificationCenterFeedbackSource,
  NotificationCenterNavigationSource,
  NotificationCenterObservabilitySource,
} from './notification-center.facades';

type TestNotificationContext = {
  tenantId: string;
  tenantName?: string;
};

type NotificationDataSourceMock = NotificationCenterDataSource & {
  notifications$?: Observable<NotificationFeedItem[]>;
};

type NotificationNavigationSourceMock = NotificationCenterNavigationSource & {
  rebuild: jest.Mock;
};

type NotificationContextSourceMock = NotificationCenterContextSource & {
  context$: () => Observable<TestNotificationContext>;
  switchContext: jest.Mock<Observable<void>, [TestNotificationContext]>;
};

type NotificationObservabilityMock = NotificationCenterObservabilitySource & {
  captureException: jest.Mock;
};

type NotificationFeedbackMock = NotificationCenterFeedbackSource;

describe('NotificationCenterComponent', () => {
  let fixture: ComponentFixture<NotificationCenterComponent>;
  let component: NotificationCenterComponent;
  let notificationService: NotificationDataSourceMock;
  let navigationService: NotificationNavigationSourceMock;
  let contextService: NotificationContextSourceMock;
  let observabilityService: NotificationObservabilityMock;
  let uiFeedbackService: NotificationFeedbackMock;

  beforeEach(async () => {
    const contextSubject = new Subject<TestNotificationContext>();

    notificationService = {
      getNotifications: jest.fn().mockReturnValue(of([])),
      markAsRead: jest.fn().mockReturnValue(of(undefined)),
      markAllAsReadBatch: jest.fn().mockReturnValue(of(undefined)),
      clearAll: jest.fn().mockReturnValue(of(undefined)),
      notifications$: undefined,
    };

    navigationService = {
      rebuild: jest.fn(),
      navigateTo: jest.fn(),
    };

    contextService = {
      contextChange$: contextSubject.asObservable(),
      context$: () => contextSubject.asObservable(),
      switchContext: jest.fn((ctx: TestNotificationContext) => {
        contextSubject.next(ctx);
        return of(undefined);
      }),
    };

    observabilityService = {
      trackEvent: jest.fn(),
      trackError: jest.fn(),
      captureException: jest.fn(),
    };

    uiFeedbackService = {
      showError: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [NotificationCenterComponent],
      providers: [
        provideRouter([]),
        {
          provide: NOTIFICATION_CENTER_DATA_SOURCE,
          useValue: notificationService,
        },
        {
          provide: NOTIFICATION_CENTER_CONTEXT_SOURCE,
          useValue: contextService,
        },
        {
          provide: NOTIFICATION_CENTER_NAVIGATION_SOURCE,
          useValue: navigationService,
        },
        {
          provide: NOTIFICATION_CENTER_OBSERVABILITY_SOURCE,
          useValue: observabilityService,
        },
        {
          provide: NOTIFICATION_CENTER_FEEDBACK_SOURCE,
          useValue: uiFeedbackService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationCenterComponent);
    component = fixture.componentInstance;

    jest.spyOn(notificationService, 'getNotifications').mockReturnValue(
      of([
        {
          id: 'n-1',
          title: 'Deploy concluído',
          body: 'O deploy da ferramenta foi finalizado.',
          severity: 'success',
          link: '/tools/tax-map',
          createdAt: new Date('2026-02-24T10:00:00Z'),
          readAt: null,
        },
        {
          id: 'n-2',
          title: 'Janela de manutenção',
          body: 'Haverá manutenção hoje às 23h.',
          severity: 'warning',
          createdAt: new Date('2026-02-23T10:00:00Z'),
          readAt: new Date('2026-02-23T12:00:00Z'),
        },
      ] as NotificationFeedItem[])
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve criar o componente e renderizar lista de notificações', fakeAsync(() => {
    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.filteredNotifications().length).toBe(2);

    const list = fixture.nativeElement.querySelector('[data-testid="notification-list"]');
    expect(list).toBeTruthy();
  }));

  it('deve exibir loading state enquanto carrega notificações', fakeAsync(() => {
    (notificationService.getNotifications as jest.Mock).mockReturnValue(of([]).pipe(delay(20)));

    fixture.detectChanges();

    const loading = fixture.nativeElement.querySelector('[data-testid="loading-state"]');
    expect(loading).toBeTruthy();
    expect(component.isLoading()).toBe(true);
  }));

  it('deve exibir empty state quando não houver notificações', fakeAsync(() => {
    (notificationService.getNotifications as jest.Mock).mockReturnValue(of([] as NotificationFeedItem[]));

    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    const emptyState = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(emptyState).toBeTruthy();
    expect(component.filteredNotifications()).toEqual([]);
  }));

  it('deve exibir estado de erro quando falhar carregamento inicial', fakeAsync(() => {
    (notificationService.getNotifications as jest.Mock).mockReturnValue(
      throwError(() => new Error('falha de carregamento'))
    );
    const trackErrorSpy = jest.spyOn(observabilityService, 'trackError');

    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const errorState = fixture.nativeElement.querySelector('[data-testid="error-state"]');
    expect(errorState).toBeTruthy();
    expect(component.errorMessage()).toBe('Não foi possível carregar as notificações.');
    expect(trackErrorSpy).toHaveBeenCalledWith('notification_center_load_error', expect.any(Error), undefined);
  }));

  it('deve marcar uma notificação como lida', fakeAsync(() => {
    const markAsReadSpy = jest.spyOn(notificationService, 'markAsRead').mockReturnValue(of(undefined));

    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    const unread = component.filteredNotifications().find((item) => !item.readAt);
    expect(unread).toBeTruthy();

    if (!unread) {
      throw new Error('Notificação não lida não encontrada para o teste');
    }

    component.markAsRead(unread);
    tick();
    fixture.detectChanges();

    expect(markAsReadSpy).toHaveBeenCalledWith('n-1');
    expect(component.notifications().find((item) => item.id === 'n-1')?.readAt).toBeTruthy();
  }));

  it('deve limpar notificações refletindo no serviço', fakeAsync(() => {
    const clearAllSpy = jest.spyOn(notificationService, 'clearAll').mockReturnValue(of(undefined));

    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    expect(component.notifications().length).toBe(2);

    component.clearAll();
    tick();
    fixture.detectChanges();

    expect(clearAllSpy).toHaveBeenCalled();
    expect(component.notifications().length).toBe(0);
  }));

  it('deve marcar todas como lidas em ação bulk', fakeAsync(() => {
    const markAllAsReadBatchSpy = jest
      .spyOn(notificationService, 'markAllAsReadBatch')
      .mockReturnValue(of(undefined));

    fixture.detectChanges();
    flush();

    component.markAllAsRead();
    tick();

    expect(markAllAsReadBatchSpy).toHaveBeenCalledWith(['n-1']);
    expect(component.notifications().every((item) => !!item.readAt)).toBe(true);
  }));

  it('deve exibir erro operacional quando markAllAsReadBatch não estiver disponível', fakeAsync(() => {
    const showErrorSpy = jest.spyOn(uiFeedbackService, 'showError');
    const markAsReadSpy = jest.spyOn(notificationService, 'markAsRead');
    Object.defineProperty(notificationService, 'markAllAsReadBatch', {
      value: undefined,
      configurable: true,
    });

    fixture.detectChanges();
    flush();

    component.markAllAsRead();
    tick();

    expect(markAsReadSpy).not.toHaveBeenCalled();
    expect(showErrorSpy).toHaveBeenCalledWith('Marcação em lote indisponível no data source de notificações.');
  }));

  it('não deve chamar serviço em markAllAsRead quando todas já estiverem lidas', fakeAsync(() => {
    (notificationService.getNotifications as jest.Mock).mockReturnValue(
      of([
        {
          id: 'n-10',
          title: 'Tudo lido',
          body: 'Sem pendências',
          severity: 'info',
          createdAt: new Date('2026-02-24T10:00:00Z'),
          readAt: new Date('2026-02-24T11:00:00Z'),
        },
      ] as NotificationFeedItem[])
    );
    const markAsReadSpy = jest.spyOn(notificationService, 'markAsRead').mockReturnValue(of(undefined));

    fixture.detectChanges();
    flush();

    component.markAllAsRead();
    tick();

    expect(markAsReadSpy).not.toHaveBeenCalled();
  }));

  it('deve navegar para deep link ao clicar na notificação', fakeAsync(() => {
    const navigateToSpy = jest.spyOn(navigationService, 'navigateTo');

    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    const linkedNotification = component.notifications().find((item) => item.link);
    expect(linkedNotification).toBeTruthy();

    if (!linkedNotification) {
      throw new Error('Notificação com deep link não encontrada para o teste');
    }

    component.onNotificationClick(linkedNotification);
    tick();

    expect(navigateToSpy).toHaveBeenCalledWith('/tools/tax-map');
  }));

  it('deve recarregar notificações quando o contexto mudar', fakeAsync(() => {
    const getNotificationsSpy = jest.spyOn(notificationService, 'getNotifications');

    fixture.detectChanges();
    flush();

    contextService.switchContext({ tenantId: 'tenant-002', tenantName: 'Tenant 2' }).subscribe();
    tick(250);

    expect(getNotificationsSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  }));

  it('deve registrar eventos de open/close no toggle do painel', () => {
    const trackEventSpy = jest.spyOn(observabilityService, 'trackEvent');

    component.togglePanel();
    component.togglePanel();

    expect(trackEventSpy).toHaveBeenCalledWith('notification_center_close');
    expect(trackEventSpy).toHaveBeenCalledWith('notification_center_open');
  });

  it('deve priorizar notifications$ quando o data source expõe stream push', fakeAsync(() => {
    const push$ = new Subject<NotificationFeedItem[]>();
    Object.defineProperty(notificationService, 'notifications$', {
      value: push$,
      configurable: true,
    });
    const getNotificationsSpy = jest.spyOn(notificationService, 'getNotifications');

    fixture.detectChanges();
    tick();

    push$.next([
      {
        id: 'push-1',
        title: 'Evento push',
        body: 'Chegou via stream',
        severity: 'info',
        createdAt: new Date('2026-02-25T08:00:00Z'),
        readAt: null,
      },
    ]);
    tick();
    fixture.detectChanges();

    expect(getNotificationsSpy).not.toHaveBeenCalled();
    expect(component.notifications().some((item) => item.id === 'push-1')).toBe(true);
  }));

  it('deve usar markAllAsReadBatch quando disponível no data source', fakeAsync(() => {
    const markAllAsReadBatchSpy = jest
      .spyOn(notificationService, 'markAllAsReadBatch')
      .mockReturnValue(of(undefined));
    const markAsReadSpy = jest.spyOn(notificationService, 'markAsRead');

    fixture.detectChanges();
    flush();

    component.markAllAsRead();
    tick();

    expect(markAllAsReadBatchSpy).toHaveBeenCalledWith(['n-1']);
    expect(markAsReadSpy).not.toHaveBeenCalled();
  }));

  it('deve normalizar datas inválidas com fallback seguro', fakeAsync(() => {
    const trackEventSpy = jest.spyOn(observabilityService, 'trackEvent');
    (notificationService.getNotifications as jest.Mock).mockReturnValue(
      of([
        {
          id: 'invalid-date-1',
          title: 'Data inválida',
          body: 'payload com data inválida',
          severity: 'warning',
          createdAt: 'not-a-date',
          readAt: 'also-invalid',
        },
      ] as NotificationFeedItem[])
    );

    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    const item = component.notifications()[0];
    expect(Number.isNaN(item.createdAt.getTime())).toBe(false);
    expect(item.readAt).toBeNull();
    expect(trackEventSpy).toHaveBeenCalledWith('notification_payload_invalid', {
      notificationId: 'invalid-date-1',
      field: 'createdAt',
    });
    expect(trackEventSpy).toHaveBeenCalledWith('notification_payload_invalid', {
      notificationId: 'invalid-date-1',
      field: 'readAt',
    });
  }));

  it('deve renderizar aria-label descritivo nos itens de notificação', fakeAsync(() => {
    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    const itemButton = fixture.nativeElement.querySelector('[data-testid="notification-item"]') as HTMLButtonElement;
    expect(itemButton.getAttribute('aria-label')).toContain('Deploy concluído');
    expect(itemButton.getAttribute('aria-label')).toContain('success');
  }));

  it('deve fechar painel ao pressionar Escape', fakeAsync(() => {
    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    expect(component.isPanelOpen()).toBe(true);

    const panel = fixture.nativeElement.querySelector('.notification-center') as HTMLElement;
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(component.isPanelOpen()).toBe(false);
  }));

  it('deve refletir estado de expansão no botão de toggle', fakeAsync(() => {
    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    const toggleButton = fixture.nativeElement.querySelector('[data-testid="toggle-panel"]') as HTMLButtonElement;
    expect(toggleButton.getAttribute('aria-expanded')).toBe('true');

    toggleButton.click();
    fixture.detectChanges();

    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');
  }));

  it('deve associar label ao seletor de severidade', fakeAsync(() => {
    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('label[for="severity-filter-select"]');
    const select = fixture.nativeElement.querySelector('#severity-filter-select') as HTMLSelectElement;

    expect(label).toBeTruthy();
    expect(select).toBeTruthy();
  }));

  it('deve mover foco para primeiro item acionável ao abrir painel', fakeAsync(() => {
    fixture.detectChanges();
    flush();
    tick();
    fixture.detectChanges();

    component.togglePanel();
    fixture.detectChanges();
    component.togglePanel();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();

    const activeElement = document.activeElement as HTMLElement | null;
    expect(['notification-item', 'filter-all']).toContain(activeElement?.dataset['testid']);
  }));

  it('deve exibir feedback operacional em erro de markAsRead', fakeAsync(() => {
    const showErrorSpy = jest.spyOn(uiFeedbackService, 'showError');
    jest.spyOn(notificationService, 'markAsRead').mockReturnValue(throwError(() => new Error('falha')));

    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    const unread = component.notifications().find((item) => !item.readAt);
    expect(unread).toBeTruthy();

    if (!unread) {
      throw new Error('Notificação não lida não encontrada para teste de erro operacional');
    }

    component.markAsRead(unread);
    tick();

    expect(showErrorSpy).toHaveBeenCalledWith('Falha ao marcar notificação como lida.');
  }));

  it('deve paginar lista grande com botão carregar mais', fakeAsync(() => {
    const manyItems: NotificationFeedItem[] = Array.from({ length: 55 }, (_, index) => ({
      id: `n-${index + 1}`,
      title: `Notificação ${index + 1}`,
      body: 'Evento',
      severity: 'info',
      createdAt: new Date(`2026-02-24T10:${(index % 60).toString().padStart(2, '0')}:00Z`),
      readAt: null,
    }));

    (notificationService.getNotifications as jest.Mock).mockReturnValue(of(manyItems));

    fixture.detectChanges();
    flush();
    fixture.detectChanges();

    expect(component.visibleNotifications().length).toBe(50);
    expect(component.hasMoreNotifications()).toBe(true);

    const loadMoreButton = fixture.nativeElement.querySelector('[data-testid="load-more-notifications"]') as HTMLButtonElement;
    loadMoreButton.click();
    fixture.detectChanges();

    expect(component.visibleNotifications().length).toBe(55);
    expect(component.hasMoreNotifications()).toBe(false);
  }));
});
