import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToolContextAdapter, ToolContextChange } from '@hub/tool-contract';
import { ToolEventsService, ToolEventType } from '@hub/tool-plugin';
import { ToolRootComponent } from './tool-root.component';

describe('ToolRootComponent', () => {
  let fixture: ComponentFixture<ToolRootComponent>;
  let component: ToolRootComponent;
  let adapter: ToolContextAdapter;
  let toolEvents: ToolEventsService;

  beforeEach(async () => {
    adapter = new ToolContextAdapter();
    toolEvents = new ToolEventsService();

    await TestBed.configureTestingModule({
      imports: [ToolRootComponent],
      providers: [
        provideRouter([]),
        { provide: ToolContextAdapter, useValue: adapter },
        { provide: ToolEventsService, useValue: toolEvents },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolRootComponent);
    component = fixture.componentInstance;
  });

  it('cria o container raiz e renderiza o router-outlet interno', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(component).toBeTruthy();
    expect(host.querySelector('[data-tool-key="tax-map"]')).toBeTruthy();
    expect(host.querySelector('router-outlet')).toBeTruthy();
    expect(host.textContent).toContain('Tax Map');
  });

  it('emite loaded e ready ao inicializar a tool', () => {
    const events: string[] = [];
    const subscription = toolEvents.onTool('tax-map').subscribe((event) => {
      events.push(event.type);
    });

    fixture.detectChanges();

    expect(events).toContain(ToolEventType.LOADED);
    expect(events).toContain(ToolEventType.READY);
    expect(component.loading).toBe(false);
    expect(component.toolContext?.tenantId).toBe('fallback-tenant');
    subscription.unsubscribe();
  });

  it('reage a mudança de contexto e emite contextChanged', () => {
    const events: string[] = [];
    const subscription = toolEvents.onTool('tax-map').subscribe((event) => {
      events.push(event.type);
    });

    fixture.detectChanges();

    const change: ToolContextChange = {
      previous: component.toolContext,
      current: {
        session: {
          userId: 'user-2',
          userName: 'Usuário 2',
          userEmail: 'user2@example.com',
          roles: ['analyst'],
          expiresAt: Date.now() + 60_000,
        },
        tenantId: 'tenant-002',
        tenantName: 'Tenant 002',
        clientId: 'client-002',
        clientName: 'Cliente 002',
        projectId: 'project-002',
        projectName: 'Projeto 002',
        environment: 'staging',
        updatedAt: Date.now(),
      },
      changeType: 'tenant',
      timestamp: Date.now(),
    };

    (adapter as unknown as {
      contextChangeSubject: { next: (value: ToolContextChange) => void };
    }).contextChangeSubject.next(change);
    fixture.detectChanges();

    expect(component.toolContext?.tenantId).toBe('tenant-002');
    expect(component.toolContext?.clientId).toBe('client-002');
    expect(events).toContain(ToolEventType.CONTEXT_CHANGED);
    subscription.unsubscribe();
  });

  it('emite unloaded ao destruir o componente', () => {
    const events: string[] = [];
    const subscription = toolEvents.onTool('tax-map').subscribe((event) => {
      events.push(event.type);
    });

    fixture.detectChanges();
    fixture.destroy();

    expect(events).toContain(ToolEventType.UNLOADED);
    subscription.unsubscribe();
  });
});

