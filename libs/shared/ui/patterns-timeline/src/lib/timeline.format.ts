import { TimelineItem } from './timeline.model';

export function formatTimestamp(iso: string, locale = undefined): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
  } catch {
    return iso;
  }
}

export function groupLabelForDay(key: string, locale = undefined): string {
  try {
    const d = new Date(key);
    return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
  } catch {
    return key;
  }
}

export function itemSummary(item: TimelineItem): string {
  return item.description || item.title || '';
}
