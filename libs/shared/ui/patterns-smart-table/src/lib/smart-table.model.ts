import { TemplateRef } from '@angular/core';
import { StandardError } from '@hub/tool-contract';

export type SmartTableDensity = 'compact' | 'comfortable';
export type SmartTableSelectionMode = 'none' | 'single' | 'multi';
export type SmartTableColumnType = 'text' | 'number' | 'date' | 'badge' | 'custom';
export type SmartTableSortDirection = 'asc' | 'desc';
export type SmartTableFilterOperator = 'contains' | 'eq' | 'in' | 'gt' | 'lt';
export type SmartTableState = 'loading' | 'ready' | 'empty' | 'error';

export interface SmartTableSort {
  key: string;
  direction: SmartTableSortDirection;
}

export interface SmartTableFilter {
  key: string;
  value: unknown;
  operator?: SmartTableFilterOperator;
}

export interface SmartTableColumn<T = unknown> {
  key: string;
  title: string;
  type?: SmartTableColumnType;
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
  cellValue?: (row: T) => unknown;
  cellTemplate?: TemplateRef<{ $implicit: T; value: unknown }>;
}

export interface SmartTableQueryState {
  page: number;
  pageSize: number;
  sort?: SmartTableSort | null;
  filters: SmartTableFilter[];
  visibleColumns?: string[];
  density?: SmartTableDensity;
}

export type SmartTableInitialState = Partial<SmartTableQueryState>;

export interface SmartTableLayoutOptions {
  density?: SmartTableDensity;
  stickyHeader?: boolean;
  zebra?: boolean;
  height?: string;
}

export interface SmartTableSelectionOptions {
  mode: SmartTableSelectionMode;
  selectAllCurrentPage?: boolean;
  selectAllMatching?: boolean;
}

export interface SmartTableRowAction<T = unknown> {
  id: string;
  label: string;
  disabled?: (row: T) => boolean;
}

export interface SmartTableBulkAction<T = unknown> {
  id: string;
  label: string;
  disabled?: (rows: T[]) => boolean;
}

export interface SmartTableActions<T = unknown> {
  row?: SmartTableRowAction<T>[];
  bulk?: SmartTableBulkAction<T>[];
}

export interface SmartTableSelectionState {
  mode: SmartTableSelectionMode;
  selectedKeys: string[];
  selectedCount: number;
  allCurrentPageSelected: boolean;
  allMatchingSelected?: boolean;
}

export interface SmartTableStateChangeEvent {
  queryState: SmartTableQueryState;
}

export interface SmartTableRowActionEvent<T = unknown> {
  actionId: string;
  row: T;
}

export interface SmartTableBulkActionEvent<T = unknown> {
  actionId: string;
  selected: T[];
  allMatchingSelected?: boolean;
}

export interface SmartTableErrorEvent {
  error: StandardError;
  queryState: SmartTableQueryState;
}

export interface SmartTableTelemetry {
  track(eventName: string, payload?: Record<string, unknown>): void;
}

export interface SmartTableViewModel<T = unknown> {
  rows: T[];
  total: number;
  state: SmartTableState;
  error?: StandardError;
}
