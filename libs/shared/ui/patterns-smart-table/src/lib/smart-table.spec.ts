import { of, throwError } from 'rxjs';
import { SimpleChange } from '@angular/core';

import { SmartTableComponent } from './smart-table.component';
import { SmartTableLocalDataProvider } from './providers/local.provider';
import { SmartTableRemoteDataProvider } from './providers/remote.provider';
import { SmartTableDataProvider } from './smart-table.provider';

interface RowMock {
  id: string;
  name: string;
  status: string;
  score: number;
}

const rowsMock: RowMock[] = [
  { id: '1', name: 'Alpha', status: 'ok', score: 30 },
  { id: '2', name: 'Beta', status: 'ok', score: 10 },
  { id: '3', name: 'Gamma', status: 'blocked', score: 20 },
];

describe('SmartTable providers', () => {
  it('provider local aplica filtro, ordenação e paginação', (done) => {
    const provider = new SmartTableLocalDataProvider(rowsMock);

    provider
      .load({
        page: 1,
        pageSize: 1,
        filters: [{ key: 'status', value: 'ok', operator: 'eq' }],
        sort: { key: 'score', direction: 'desc' },
      })
      .subscribe((result) => {
        expect(result.total).toBe(2);
        expect(result.rows[0].id).toBe('1');
        done();
      });
  });

  it('provider remoto delega query state para fetch fn', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ rows: rowsMock, total: rowsMock.length });
    const provider = new SmartTableRemoteDataProvider<RowMock>(fetchFn);

    await provider.load({ page: 2, pageSize: 25, filters: [], sort: null });

    expect(fetchFn).toHaveBeenCalledWith({ page: 2, pageSize: 25, filters: [], sort: null });
  });
});

describe('SmartTableComponent', () => {
  function createComponent(provider?: SmartTableDataProvider<RowMock>): SmartTableComponent<RowMock> {
    const component = new SmartTableComponent<RowMock>();
    component.columns = [
      { key: 'name', title: 'Nome', sortable: true, filterable: true },
      { key: 'status', title: 'Status', filterable: true },
      { key: 'score', title: 'Score', sortable: true },
    ];
    component.rowKey = 'id';
    component.dataProvider =
      provider ??
      ({
        load: () => of({ rows: rowsMock, total: rowsMock.length }),
      } as SmartTableDataProvider<RowMock>);
    component.selectionMode = 'multi';
    return component;
  }

  it('emite stateChange ao ordenar e dispara carga', () => {
    const provider = {
      load: jest.fn().mockReturnValue(of({ rows: rowsMock, total: rowsMock.length })),
    } as SmartTableDataProvider<RowMock>;
    const component = createComponent(provider);
    const stateSpy = jest.fn();
    component.stateChange.subscribe(stateSpy);

    component.ngOnInit();
    component.onSort(component.columns[0]);

    expect(stateSpy).toHaveBeenCalled();
    expect(provider.load).toHaveBeenCalledTimes(2);
  });

  it('mantém estado empty quando provider retorna sem linhas', () => {
    const component = createComponent({
      load: () => of({ rows: [], total: 0 }),
    });

    component.ngOnInit();

    expect(component.tableState).toBe('empty');
  });

  it('mantém estado error e emite evento quando provider falha', () => {
    const component = createComponent({
      load: () => throwError(() => ({ message: 'Falhou', code: 'ERR_LOAD' })),
    });
    const errorSpy = jest.fn();
    component.error.subscribe(errorSpy);

    component.ngOnInit();

    expect(component.tableState).toBe('error');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('seleção multi emite selectionChange corretamente', () => {
    const component = createComponent();
    const selectionSpy = jest.fn();
    component.selectionChange.subscribe(selectionSpy);

    component.ngOnInit();
    component.onToggleRowSelection(rowsMock[0], true);

    expect(component.selectionState.selectedCount).toBe(1);
    expect(selectionSpy).toHaveBeenCalled();
  });

  it('marca allMatchingSelected quando habilitado e solicitado', () => {
    const component = createComponent();
    component.selectionOptions = { mode: 'multi', selectAllMatching: true };
    component.ngOnInit();

    component.onSelectAllMatching();

    expect(component.selectionState.allMatchingSelected).toBe(true);
    expect(component.selectionState.selectedCount).toBeGreaterThan(0);
  });

  it('recarrega dados quando initialState muda após init', () => {
    const provider = {
      load: jest.fn().mockReturnValue(of({ rows: rowsMock, total: rowsMock.length })),
    } as SmartTableDataProvider<RowMock>;
    const component = createComponent(provider);

    component.ngOnInit();
    provider.load.mockClear();

    component.initialState = { page: 2, pageSize: 1 };
    component.ngOnChanges({
      initialState: new SimpleChange(undefined, component.initialState, false),
    });

    expect(provider.load).toHaveBeenCalledTimes(1);
    expect(component.queryState.page).toBe(2);
    expect(component.queryState.pageSize).toBe(1);
  });
});
