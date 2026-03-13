import { TimelineItem } from './timeline.model';

export function truncate(text: string | undefined, max = 200) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

export function sanitize(text: string | undefined) {
  if (!text) return '';
  // Minimal sanitization: strip control chars. Consumers are responsible for full sanitization.
  return text.replace(/\p{C}/gu, '');
}

export function trackById(_index: number, item: TimelineItem) {
  return item.id;
}
