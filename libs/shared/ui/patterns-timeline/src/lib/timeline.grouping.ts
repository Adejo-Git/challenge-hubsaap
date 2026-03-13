import { TimelineItem, TimelineGroup, GroupBy, SortDirection } from './timeline.model';
import { groupLabelForDay } from './timeline.format';

export interface GroupingOptions {
  dayTimezone?: 'local' | 'utc';
}

function parseDate(d: string) {
  return new Date(d);
}

function toLocalDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toUtcDayKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sortItems(items: TimelineItem[], direction: SortDirection = 'desc') {
  const mul = direction === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => mul * (parseDate(a.timestamp).getTime() - parseDate(b.timestamp).getTime()));
}

export function groupByDay(items: TimelineItem[], options?: GroupingOptions): TimelineGroup[] {
  const timezone = options?.dayTimezone ?? 'local';
  const map = new Map<string, TimelineItem[]>();
  items.forEach(it => {
    const d = parseDate(it.timestamp);
    const key = timezone === 'utc' ? toUtcDayKey(d) : toLocalDayKey(d);
    const arr = map.get(key) || [];
    arr.push(it);
    map.set(key, arr);
  });
  return Array.from(map.entries()).map(([k, v]) => ({ key: k, label: groupLabelForDay(k), items: v }));
}

export function groupByField(items: TimelineItem[], field: 'actor' | 'type'): TimelineGroup[] {
  const map = new Map<string, TimelineItem[]>();
  items.forEach(it => {
    const fieldValue = it[field];
    const key = fieldValue || 'unknown';
    const arr = map.get(key) || [];
    arr.push(it);
    map.set(key, arr);
  });
  return Array.from(map.entries()).map(([k, v]) => ({ key: k, label: k, items: v }));
}

export function groupItems(
  items: TimelineItem[],
  groupBy: GroupBy,
  direction: SortDirection = 'desc',
  options?: GroupingOptions,
): TimelineGroup[] {
  const sorted = sortItems(items, direction);
  if (groupBy === 'none') {
    return [{ key: 'all', label: 'Todos', items: sorted }];
  }
  if (groupBy === 'day') {
    return groupByDay(sorted, options);
  }
  if (groupBy === 'actor') {
    return groupByField(sorted, 'actor');
  }
  if (groupBy === 'type') {
    return groupByField(sorted, 'type');
  }
  return [{ key: 'all', label: 'Todos', items: sorted }];
}
