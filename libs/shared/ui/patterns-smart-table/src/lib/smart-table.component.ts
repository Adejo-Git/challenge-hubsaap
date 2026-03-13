import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, from, isObservable } from 'rxjs';
import { UiLayoutModule } from '@hub/shared/ui-layout';
import { StandardError } from '@hub/tool-contract';

import {
  SmartTableActions,
  SmartTableBulkActionEvent,
  SmartTableColumn,
  SmartTableErrorEvent,
  SmartTableInitialState,
  SmartTableLayoutOptions,
  SmartTableQueryState,
  SmartTableRowActionEvent,
  SmartTableSelectionMode,
  SmartTableSelectionOptions,
  SmartTableSelectionState,
  SmartTableState,
  SmartTableStateChangeEvent,
  SmartTableTelemetry,
} from './smart-table.model';
import { SmartTableDataProvider } from './smart-table.provider';
import {
  createEmptySelection,
  getVisibleColumns,
  mergeFilters,
  normalizeQueryState,
  resolveRowKey,
  SMART_TABLE_DEFAULT_PAGE_SIZE,
} from './smart-table.util';
import { SmartTablePreferencesStore } from './smart-table.preferences';
import { buildRowAriaLabel, onGridKeydown, resolveAriaSort, shouldUseGridRole } from './smart-table.a11y';

@Component({
  selector: 'hub-smart-table',
  standalone: true,
  imports: [CommonModule, FormsModule, UiLayoutModule],
  templateUrl: './smart-table.component.html',
  styleUrls: ['./smart-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartTableComponent<T extends Record<string, unknown>> implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) columns: SmartTableColumn<T>[] = [];
  @Input({ required: true }) dataProvider!: SmartTableDataProvider<T>;
  @Input() rowKey: keyof T | ((row: T) => string) = 'id' as keyof T;
  @Input() initialState?: SmartTableInitialState;
  @Input() selectionMode: SmartTableSelectionMode = 'none';
  @Input() selectionOptions?: SmartTableSelectionOptions;
  @Input() actions?: SmartTableActions<T>;
  @Input() layoutOptions: SmartTableLayoutOptions = {};
  @Input() preferencesKey?: string;
  @Input() telemetry?: SmartTableTelemetry;

  @Output() readonly stateChange = new EventEmitter<SmartTableStateChangeEvent>();
  @Output() readonly selectionChange = new EventEmitter<SmartTableSelectionState>();
  @Output() readonly rowAction = new EventEmitter<SmartTableRowActionEvent<T>>();
  @Output() readonly bulkAction = new EventEmitter<SmartTableBulkActionEvent<T>>();
  @Output() readonly error = new EventEmitter<SmartTableErrorEvent>();

  queryState: SmartTableQueryState = normalizeQueryState();
  rows: T[] = [];
  total = 0;
  tableState: SmartTableState = 'loading';
  tableError?: StandardError;
  visibleColumns: SmartTableColumn<T>[] = [];
  selectionState: SmartTableSelectionState = createEmptySelection('none');
  filterDraft: Record<string, string> = {};

  private readonly subscriptions = new Subscription();
  private readonly preferencesStore = new SmartTablePreferencesStore(
    typeof window !== 'undefined' ? window.localStorage : undefined,
  );
  private requestSerial = 0;
  private initialized = false;

  ngOnInit(): void {
    this.initialized = true;
    this.bootstrapFromInitialState();
    this.loadData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const stateInputsChanged = Boolean(changes['columns'] || changes['initialState']);

    if (stateInputsChanged) {
      this.bootstrapFromInitialState();

      if (this.initialized) {
        this.emitStateChange();
        this.loadData();
      }
    }

    if (changes['dataProvider'] && !changes['dataProvider'].firstChange) {
      this.loadData();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.dataProvider?.cancel?.();
  }

  get canSelectRows(): boolean {
    return this.selectionState.mode !== 'none';
  }

  get allPageRowsSelected(): boolean {
    if (!this.rows.length) {
      return false;
    }

    return this.rows.every((row) => this.isRowSelected(row));
  }

  get selectedRows(): T[] {
    const selected = new Set(this.selectionState.selectedKeys);
    return this.rows.filter((row) => selected.has(this.resolveKey(row)));
  }

  get hasBulkActions(): boolean {
    return Boolean(this.actions?.bulk?.length);
  }

  get canSelectAllMatching(): boolean {
    return Boolean(this.selectionOptions?.selectAllMatching && this.selectionState.mode === 'multi' && this.total > 0);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.queryState.pageSize));
  }

  get tableRole(): 'table' | 'grid' {
    return shouldUseGridRole(this.canSelectRows || Boolean(this.actions?.row?.length));
  }

  onSort(column: SmartTableColumn<T>): void {
    if (!column.sortable) {
      return;
    }

    const currentSort = this.queryState.sort;
    const nextDirection =
      currentSort?.key === column.key && currentSort.direction === 'asc' ? 'desc' : 'asc';

    this.patchQueryState({
      sort: {
        key: column.key,
        direction: nextDirection,
      },
      page: 1,
    });
  }

  onFilterInput(columnKey: string, value: string): void {
    this.filterDraft[columnKey] = value;
    const nextFilters = mergeFilters(this.queryState.filters, {
      key: columnKey,
      value,
      operator: 'contains',
    });

    this.patchQueryState({
      filters: nextFilters,
      page: 1,
    });
  }

  onPageChange(page: number): void {
    const normalized = Math.min(Math.max(1, page), this.totalPages);
    this.patchQueryState({ page: normalized });
  }

  onPageSizeChange(pageSize: number): void {
    const normalizedPageSize = Number.isFinite(pageSize) ? Math.max(1, pageSize) : SMART_TABLE_DEFAULT_PAGE_SIZE;
    this.patchQueryState({ pageSize: normalizedPageSize, page: 1 });
    this.persistPreferences();
  }

  onRetry(): void {
    this.loadData(true);
  }

  onToggleAllPageRows(checked: boolean): void {
    if (!this.canSelectRows || this.selectionState.mode === 'single') {
      return;
    }

    const selectedKeys = checked
      ? [...new Set([...this.selectionState.selectedKeys, ...this.rows.map((row) => this.resolveKey(row))])]
      : this.selectionState.selectedKeys.filter((key) => !this.rows.some((row) => this.resolveKey(row) === key));

    this.updateSelection(selectedKeys);
  }

  onToggleRowSelection(row: T, checked: boolean): void {
    if (!this.canSelectRows) {
      return;
    }

    const key = this.resolveKey(row);
    if (this.selectionState.mode === 'single') {
      this.updateSelection(checked ? [key] : []);
      return;
    }

    const nextSelection = new Set(this.selectionState.selectedKeys);
    if (checked) {
      nextSelection.add(key);
    } else {
      nextSelection.delete(key);
    }

    this.updateSelection([...nextSelection]);
  }

  isRowSelected(row: T): boolean {
    return this.selectionState.selectedKeys.includes(this.resolveKey(row));
  }

  onRowAction(actionId: string, row: T): void {
    this.rowAction.emit({ actionId, row });
  }

  onBulkAction(actionId: string): void {
    this.bulkAction.emit({
      actionId,
      selected: this.selectedRows,
      allMatchingSelected: this.selectionState.allMatchingSelected,
    });
  }

  onSelectAllMatching(): void {
    if (!this.canSelectAllMatching) {
      return;
    }

    const selectedKeys = [...new Set([...this.selectionState.selectedKeys, ...this.rows.map((row) => this.resolveKey(row))])];
    this.updateSelection(selectedKeys, true);
  }

  onClearSelection(): void {
    this.updateSelection([], false);
  }

  onToggleColumnVisibility(columnKey: string, checked: boolean): void {
    const current = new Set(this.queryState.visibleColumns ?? this.columns.map((column) => column.key));
    if (checked) {
      current.add(columnKey);
    } else {
      current.delete(columnKey);
    }

    this.patchQueryState({
      visibleColumns: [...current],
    });
    this.persistPreferences();
  }

  isColumnVisible(columnKey: string): boolean {
    return (this.queryState.visibleColumns ?? this.columns.map((column) => column.key)).includes(columnKey);
  }

  getCellValue(row: T, column: SmartTableColumn<T>): unknown {
    if (column.cellValue) {
      return column.cellValue(row);
    }

    return (row as Record<string, unknown>)[column.key];
  }

  getColumnSortAria(columnKey: string): 'none' | 'ascending' | 'descending' {
    return resolveAriaSort(columnKey, this.queryState.sort);
  }

  getRowAriaLabel(index: number): string {
    return buildRowAriaLabel(index);
  }

  handleGridKeydown(event: KeyboardEvent): void {
    onGridKeydown(event);
  }

  trackByColumn(_index: number, column: SmartTableColumn<T>): string {
    return column.key;
  }

  trackByRow(_index: number, row: T): string {
    return this.resolveKey(row);
  }

  private bootstrapFromInitialState(): void {
    const normalized = normalizeQueryState(this.initialState);
    const withPreferences = this.applyPreferences(normalized);

    this.queryState = withPreferences;
    this.visibleColumns = getVisibleColumns(this.columns, this.queryState.visibleColumns);
    this.selectionState = createEmptySelection(this.selectionOptions?.mode ?? this.selectionMode);
  }

  private applyPreferences(initial: SmartTableQueryState): SmartTableQueryState {
    if (!this.preferencesKey) {
      return initial;
    }

    const preferences = this.preferencesStore.read(this.preferencesKey);
    if (!preferences) {
      return initial;
    }

    return {
      ...initial,
      density: preferences.density ?? initial.density,
      pageSize: preferences.pageSize ?? initial.pageSize,
      visibleColumns: preferences.visibleColumns ?? initial.visibleColumns,
    };
  }

  private persistPreferences(): void {
    if (!this.preferencesKey) {
      return;
    }

    this.preferencesStore.write(this.preferencesKey, {
      density: this.queryState.density,
      pageSize: this.queryState.pageSize,
      visibleColumns: this.queryState.visibleColumns,
    });
  }

  private patchQueryState(patch: Partial<SmartTableQueryState>): void {
    this.queryState = {
      ...this.queryState,
      ...patch,
    };
    this.visibleColumns = getVisibleColumns(this.columns, this.queryState.visibleColumns);
    this.emitStateChange();
    this.loadData();
  }

  private loadData(forceRefresh = false): void {
    if (!this.dataProvider) {
      return;
    }

    this.requestSerial += 1;
    const currentRequest = this.requestSerial;
    this.tableState = 'loading';
    this.tableError = undefined;
    this.dataProvider.cancel?.();

    const source = forceRefresh && this.dataProvider.refresh
      ? this.dataProvider.refresh(this.queryState)
      : this.dataProvider.load(this.queryState);

    const observable = isObservable(source) ? source : from(source);
    const sub = observable.subscribe({
      next: (result) => {
        if (currentRequest !== this.requestSerial) {
          return;
        }

        this.rows = result.rows;
        this.total = result.total;
        this.tableState = result.rows.length ? 'ready' : 'empty';
      },
      error: (err: unknown) => {
        if (currentRequest !== this.requestSerial) {
          return;
        }

        const normalizedError = this.normalizeError(err);
        this.tableError = normalizedError;
        this.tableState = 'error';
        this.telemetry?.track('table.error', {
          code: normalizedError.code,
          page: this.queryState.page,
          pageSize: this.queryState.pageSize,
        });
        this.error.emit({
          error: normalizedError,
          queryState: this.queryState,
        });
      },
    });

    this.subscriptions.add(sub);
  }

  private normalizeError(error: unknown): StandardError {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const typed = error as StandardError;
      return {
        message: typed.message,
        code: typed.code,
        category: typed.category,
        correlationId: typed.correlationId,
      };
    }

    return {
      message: 'Falha ao carregar dados da tabela.',
      code: 'SMART_TABLE_LOAD_FAILED',
      category: 'unknown',
    };
  }

  private emitStateChange(): void {
    this.telemetry?.track('table.queryChange', {
      page: this.queryState.page,
      pageSize: this.queryState.pageSize,
      sort: this.queryState.sort?.key ?? null,
      filtersCount: this.queryState.filters.length,
    });

    this.stateChange.emit({
      queryState: this.queryState,
    });
  }

  private updateSelection(selectedKeys: string[], allMatchingSelected = false): void {
    this.selectionState = {
      mode: this.selectionState.mode,
      selectedKeys,
      selectedCount: selectedKeys.length,
      allCurrentPageSelected:
        this.rows.length > 0 && this.rows.every((row) => selectedKeys.includes(this.resolveKey(row))),
      allMatchingSelected,
    };

    this.selectionChange.emit(this.selectionState);
  }

  private resolveKey(row: T): string {
    return resolveRowKey(row, this.rowKey);
  }
}
