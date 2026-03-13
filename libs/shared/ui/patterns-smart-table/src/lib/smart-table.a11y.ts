import { SmartTableSort } from './smart-table.model';

export type SmartTableAriaSort = 'none' | 'ascending' | 'descending';

export function resolveAriaSort(columnKey: string, sort?: SmartTableSort | null): SmartTableAriaSort {
  if (!sort || sort.key !== columnKey) {
    return 'none';
  }

  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

export function shouldUseGridRole(interactiveRows: boolean): 'table' | 'grid' {
  return interactiveRows ? 'grid' : 'table';
}

export function buildRowAriaLabel(index: number): string {
  return `Linha ${index + 1}`;
}

export function onGridKeydown(event: KeyboardEvent, focusableSelectors = 'button, a, input, [tabindex]'): void {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
    return;
  }

  const target = event.target as HTMLElement | null;
  const row = target?.closest('tr');
  if (!row) {
    return;
  }

  const sibling = event.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
  const nextFocusable = sibling?.querySelector<HTMLElement>(focusableSelectors);
  if (!nextFocusable) {
    return;
  }

  event.preventDefault();
  nextFocusable.focus();
}
