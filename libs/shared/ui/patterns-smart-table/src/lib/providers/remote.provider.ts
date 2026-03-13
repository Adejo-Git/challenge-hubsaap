import { SmartTableQueryState } from '../smart-table.model';
import { SmartTableDataProvider, SmartTableDataSourceResponse, SmartTableRemoteFetchFn } from '../smart-table.provider';

export class SmartTableRemoteDataProvider<T> implements SmartTableDataProvider<T> {
  private lastQueryState: SmartTableQueryState | null = null;
  private isCancelled = false;

  constructor(private readonly fetchFn: SmartTableRemoteFetchFn<T>) {}

  load(queryState: SmartTableQueryState): SmartTableDataSourceResponse<T> {
    this.lastQueryState = queryState;
    this.isCancelled = false;
    return this.fetchFn(queryState);
  }

  refresh(queryState?: SmartTableQueryState): SmartTableDataSourceResponse<T> {
    const nextQueryState = queryState ?? this.lastQueryState;
    if (!nextQueryState) {
      throw new Error('SmartTableRemoteDataProvider.refresh requires at least one previous queryState.');
    }

    this.isCancelled = false;
    return this.fetchFn(nextQueryState);
  }

  cancel(): void {
    this.isCancelled = true;
  }

  get cancelled(): boolean {
    return this.isCancelled;
  }
}
