import {
  SmartTableColumn,
  SmartTableFilter,
  SmartTableInitialState,
  SmartTableQueryState,
  SmartTableSelectionState,
} from './smart-table.model';

export const SMART_TABLE_DEFAULT_PAGE_SIZE = 10;

export function normalizeQueryState(initialState?: SmartTableInitialState): SmartTableQueryState {
  return {
    page: Math.max(1, initialState?.page ?? 1),
    pageSize: Math.max(1, initialState?.pageSize ?? SMART_TABLE_DEFAULT_PAGE_SIZE),
    sort: initialState?.sort ?? null,
    filters: normalizeFilters(initialState?.filters ?? []),
    visibleColumns: initialState?.visibleColumns ? [...initialState.visibleColumns] : undefined,
    density: initialState?.density ?? 'comfortable',
  };
}

export function normalizeFilters(filters: SmartTableFilter[]): SmartTableFilter[] {
  return filters
    .filter((filter) => filter.key)
    .map((filter) => ({
      key: filter.key,
      operator: filter.operator ?? 'contains',
      value: filter.value,
    }));
}

export function mergeFilters(currentFilters: SmartTableFilter[], nextFilter: SmartTableFilter): SmartTableFilter[] {
  const filtered = currentFilters.filter((item) => item.key !== nextFilter.key);
  const hasValue = !isEmptyFilterValue(nextFilter.value);

  if (!hasValue) {
    return filtered;
  }

  return [...filtered, { ...nextFilter, operator: nextFilter.operator ?? 'contains' }];
}

export function isQueryStateEqual(a: SmartTableQueryState, b: SmartTableQueryState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function getVisibleColumns<T>(columns: SmartTableColumn<T>[], visibleColumns?: string[]): SmartTableColumn<T>[] {
  if (!visibleColumns?.length) {
    return columns;
  }

  const keySet = new Set(visibleColumns);
  return columns.filter((column) => keySet.has(column.key));
}

export function createEmptySelection(mode: SmartTableSelectionState['mode']): SmartTableSelectionState {
  return {
    mode,
    selectedKeys: [],
    selectedCount: 0,
    allCurrentPageSelected: false,
    allMatchingSelected: false,
  };
}

export function resolveRowKey<T>(row: T, rowKey: keyof T | ((row: T) => string)): string {
  if (typeof rowKey === 'function') {
    return rowKey(row);
  }

  return String(row[rowKey]);
}

export function isEmptyFilterValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}
