import { Observable, of } from 'rxjs';

import { SmartTableFilter, SmartTableSort } from '../smart-table.model';
import { SmartTableDataProvider, SmartTableDataResult } from '../smart-table.provider';
import { SmartTableQueryState } from '../smart-table.model';

export class SmartTableLocalDataProvider<T extends Record<string, unknown>> implements SmartTableDataProvider<T> {
  constructor(private readonly sourceRows: T[]) {}

  load(queryState: SmartTableQueryState): Observable<SmartTableDataResult<T>> {
    const filteredRows = applyFilters(this.sourceRows, queryState.filters);
    const sortedRows = applySort(filteredRows, queryState.sort ?? null);

    const start = (queryState.page - 1) * queryState.pageSize;
    const end = start + queryState.pageSize;
    const pagedRows = sortedRows.slice(start, end);

    return of({
      rows: pagedRows,
      total: sortedRows.length,
    });
  }
}

function applyFilters<T extends Record<string, unknown>>(rows: T[], filters: SmartTableFilter[]): T[] {
  if (!filters.length) {
    return rows;
  }

  return rows.filter((row) => {
    return filters.every((filter) => {
      const value = row[filter.key];
      const operator = filter.operator ?? 'contains';

      if (operator === 'eq') {
        return String(value ?? '') === String(filter.value ?? '');
      }

      if (operator === 'in') {
        return Array.isArray(filter.value) ? filter.value.includes(value) : false;
      }

      if (operator === 'gt') {
        return Number(value ?? 0) > Number(filter.value ?? 0);
      }

      if (operator === 'lt') {
        return Number(value ?? 0) < Number(filter.value ?? 0);
      }

      return String(value ?? '')
        .toLowerCase()
        .includes(String(filter.value ?? '').toLowerCase());
    });
  });
}

function applySort<T extends Record<string, unknown>>(rows: T[], sort: SmartTableSort | null): T[] {
  if (!sort) {
    return rows;
  }

  const directionFactor = sort.direction === 'asc' ? 1 : -1;
  const sorted = [...rows].sort((left, right) => {
    const leftValue = left[sort.key];
    const rightValue = right[sort.key];

    if (leftValue === rightValue) {
      return 0;
    }

    return leftValue > rightValue ? directionFactor : -directionFactor;
  });

  return sorted;
}
