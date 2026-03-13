import { Observable } from 'rxjs';

import { SmartTableQueryState } from './smart-table.model';

export interface SmartTableDataResult<T> {
  rows: T[];
  total: number;
  meta?: Record<string, unknown>;
}

export type SmartTableDataSourceResponse<T> = Promise<SmartTableDataResult<T>> | Observable<SmartTableDataResult<T>>;

export interface SmartTableDataProvider<T> {
  load(queryState: SmartTableQueryState): SmartTableDataSourceResponse<T>;
  cancel?(): void;
  refresh?(queryState: SmartTableQueryState): SmartTableDataSourceResponse<T>;
}

export interface SmartTableRemoteFetchFn<T> {
  (queryState: SmartTableQueryState): SmartTableDataSourceResponse<T>;
}
