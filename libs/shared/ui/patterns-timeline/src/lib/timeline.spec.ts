import { groupItems } from './timeline.grouping';
import { applyFilters } from './timeline.filters';
import { TimelineComponent } from './timeline.component';
import { RendererTemplates, TimelineGroup, TimelineItem } from './timeline.model';
import { SimpleChanges } from '@angular/core';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiThemeService } from '@hub/shared/ui-theme';
import { TimelineModule } from './timeline.module';

describe('PatternsTimeline utilities', () => {
  const items: TimelineItem[] = [
    { id: '1', timestamp: '2021-01-02T10:00:00Z', title: 'A', actor: 'alice', type: 'create' },
    { id: '2', timestamp: '2021-01-01T12:00:00Z', title: 'B', actor: 'bob', type: 'update' },
  ];

  it('groups by day', () => {
    const groups = groupItems(items, 'day', 'desc');
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].items[0].id).toBeDefined();
  });

  it('filters by type', () => {
    const filtered = applyFilters(items, { types: ['create'] });
    expect(filtered.length).toBe(1);
    expect(filtered[0].type).toBe('create');
  });

  it('orders desc by default', () => {
    const groups = groupItems(items, 'none');
    expect(groups[0].items[0].id).toBe('1');
  });

  it('usa label em pt-BR para groupBy none', () => {
    const groups = groupItems(items, 'none');
    expect(groups[0].label).toBe('Todos');
  });

  it('permite agrupamento por dia em UTC quando configurado', () => {
    const utcItems: TimelineItem[] = [
      { id: 'u1', timestamp: '2021-01-01T23:30:00-03:00', title: 'Evento 1' },
      { id: 'u2', timestamp: '2021-01-02T00:30:00-03:00', title: 'Evento 2' },
    ];

    const localGroups = groupItems(utcItems, 'day', 'asc', { dayTimezone: 'local' });
    const utcGroups = groupItems(utcItems, 'day', 'asc', { dayTimezone: 'utc' });

    expect(localGroups.length).toBeGreaterThanOrEqual(1);
    expect(utcGroups.length).toBe(1);
  });
});

describe('TimelineComponent', () => {
  const themeServiceStub = {
    snapshot: () => ({ key: 'dark' }),
  };

  const items: TimelineItem[] = [
    {
      id: 'a1',
      timestamp: '2024-01-20T10:00:00Z',
      title: 'Criação',
      actor: 'alice',
      type: 'create',
      tags: ['audit'],
    },
    {
      id: 'a2',
      timestamp: '2024-01-21T10:00:00Z',
      title: 'Aprovação',
      actor: 'bob',
      type: 'approve',
      tags: ['decision'],
    },
  ];

  it('recalcula grupos no ngOnChanges', () => {
    const component = new TimelineComponent(themeServiceStub as never);
    component.items = items;
    component.groupBy = 'day';

    component.ngOnChanges({} as SimpleChanges);

    expect(component.grouped.length).toBe(2);
  });

  it('emite itemClick', () => {
    const component = new TimelineComponent(themeServiceStub as never);
    const emitSpy = jest.spyOn(component.itemClick, 'emit');

    component.onItemClick(items[0]);

    expect(emitSpy).toHaveBeenCalledWith(items[0]);
  });

  it('emite loadMore', () => {
    const component = new TimelineComponent(themeServiceStub as never);
    const emitSpy = jest.spyOn(component.loadMore, 'emit');

    component.onLoadMore();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('aplica filtros e emite filterChange', () => {
    const component = new TimelineComponent(themeServiceStub as never);
    component.items = items;
    component.ngOnChanges({} as SimpleChanges);
    const emitSpy = jest.spyOn(component.filterChange, 'emit');

    component.onFilterChange({ types: ['approve'] });

    expect(component.grouped.every((group) => group.items.every((item) => item.type === 'approve'))).toBe(true);
    expect(emitSpy).toHaveBeenCalledWith({ types: ['approve'] });
  });

  it('retorna trackBy estável para grupos e itens', () => {
    const component = new TimelineComponent(themeServiceStub as never);
    const group: TimelineGroup = { key: '2024-01-20', label: '2024-01-20', items: [] };
    expect(component.trackByItem(0, items[0])).toBe('a1');
    expect(component.trackByGroup(0, group)).toBe('2024-01-20');
  });

  it('exibe estado empty quando não há itens', () => {
    const component = new TimelineComponent(themeServiceStub as never);
    component.items = [];
    component.state = 'ready';
    component.ngOnChanges({} as SimpleChanges);

    expect(component.showEmptyState).toBe(true);
  });
});

@Component({
  standalone: false,
  template: `
    <patterns-timeline
      [items]="items"
      [state]="state"
      [error]="error"
      [renderers]="renderers"
      [uiOptions]="uiOptions"
    ></patterns-timeline>

    <ng-template #headerTpl let-item>
      <div data-testid="custom-header">Custom: {{ item.title }}</div>
    </ng-template>

    <ng-template #bodyTpl let-item>
      <div data-testid="custom-body">Body: {{ item.id }}</div>
    </ng-template>
  `,
})
class TimelineHostComponent {
  @ViewChild('headerTpl', { static: true }) headerTpl!: TemplateRef<unknown>;
  @ViewChild('bodyTpl', { static: true }) bodyTpl!: TemplateRef<unknown>;

  items: TimelineItem[] = [
    {
      id: 'a1',
      timestamp: '2024-01-20T10:00:00Z',
      title: 'Criação',
      description: 'Descrição',
      actor: 'alice',
      type: 'create',
    },
  ];

  state: 'loading' | 'ready' | 'empty' | 'error' = 'ready';
  error = { code: 'TL-001', message: 'Falha ao carregar timeline' };
  renderers?: RendererTemplates;
  uiOptions?: {
    enableVirtualScroll?: boolean;
    virtualScrollMinItems?: number;
    virtualScrollItemSize?: number;
    virtualScrollHeightPx?: number;
  };

  setCustomRenderers() {
    this.renderers = {
      itemHeader: this.headerTpl,
      itemBody: this.bodyTpl,
    };
  }
}

describe('TimelineComponent template integration', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimelineModule],
      declarations: [TimelineHostComponent],
      providers: [{ provide: UiThemeService, useValue: { snapshot: () => ({ key: 'dark' }) } }],
    }).compileComponents();
  });

  it('renderiza mensagem de erro quando state = error', () => {
    const fixture = TestBed.createComponent(TimelineHostComponent);
    fixture.componentInstance.state = 'error';

    fixture.detectChanges();

    const errorEl = fixture.nativeElement.querySelector('[data-testid="timeline-error"]') as HTMLElement;
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toContain('Falha ao carregar timeline');
  });

  it('renderiza templates customizados quando renderers são informados', () => {
    const fixture = TestBed.createComponent(TimelineHostComponent);
    fixture.componentInstance.setCustomRenderers();

    fixture.detectChanges();

    const customHeader = fixture.nativeElement.querySelector('[data-testid="custom-header"]') as HTMLElement;
    const customBody = fixture.nativeElement.querySelector('[data-testid="custom-body"]') as HTMLElement;

    expect(customHeader).toBeTruthy();
    expect(customBody).toBeTruthy();
    expect(customHeader.textContent).toContain('Custom: Criação');
  });

  it('renderiza item com acessibilidade mínima (button + aria-label)', () => {
    const fixture = TestBed.createComponent(TimelineHostComponent);

    fixture.detectChanges();

    const itemButton = fixture.nativeElement.querySelector('.item') as HTMLButtonElement;
    expect(itemButton.tagName).toBe('BUTTON');
    expect(itemButton.getAttribute('aria-label')).toContain('Abrir evento:');
  });

  it('permite customizar aria-label via input', () => {
    const fixture = TestBed.createComponent(TimelineHostComponent);
    const timelineComponent = fixture.debugElement.children[0].componentInstance as TimelineComponent;
    timelineComponent.itemAriaLabelBuilder = (item) => `Evento custom: ${item.id}`;

    fixture.detectChanges();

    const itemButton = fixture.nativeElement.querySelector('.item') as HTMLButtonElement;
    expect(itemButton.getAttribute('aria-label')).toBe('Evento custom: a1');
  });

  it('ativa virtual scroll para listas grandes quando habilitado', () => {
    const fixture = TestBed.createComponent(TimelineHostComponent);
    fixture.componentInstance.items = Array.from({ length: 220 }, (_value, index) => ({
      id: `id-${index}`,
      timestamp: new Date(Date.now() - index * 1000).toISOString(),
      title: `Evento ${index}`,
      actor: 'user',
      type: 'log',
    }));
    fixture.componentInstance.uiOptions = {
      enableVirtualScroll: true,
      virtualScrollMinItems: 50,
      virtualScrollItemSize: 64,
      virtualScrollHeightPx: 320,
    };

    fixture.detectChanges();

    const viewport = fixture.nativeElement.querySelector('cdk-virtual-scroll-viewport') as HTMLElement;
    expect(viewport).toBeTruthy();
  });

  it('mantém renderização estável com 10k itens e virtual scroll ativo', () => {
    const fixture = TestBed.createComponent(TimelineHostComponent);
    fixture.componentInstance.items = Array.from({ length: 10000 }, (_value, index) => ({
      id: `id-${index}`,
      timestamp: new Date(Date.now() - index * 1000).toISOString(),
      title: `Evento ${index}`,
      actor: index % 2 === 0 ? 'alice' : 'bob',
      type: index % 3 === 0 ? 'create' : 'update',
      tags: ['audit'],
    }));
    fixture.componentInstance.uiOptions = {
      enableVirtualScroll: true,
      virtualScrollMinItems: 100,
      virtualScrollItemSize: 64,
      virtualScrollHeightPx: 360,
      maxItems: 10000,
    };

    fixture.detectChanges();

    const timelineComponent = fixture.debugElement.children[0].componentInstance as TimelineComponent;
    expect(timelineComponent.useVirtualScroll).toBe(true);
    expect(timelineComponent.grouped.length).toBeGreaterThan(0);
  });

});
