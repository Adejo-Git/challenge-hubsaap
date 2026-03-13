import { TimelineItem, FilterConfig } from './timeline.model';

export function applyFilters(items: TimelineItem[], filters?: FilterConfig) {
  if (!filters) return items;
  return items.filter(it => {
    if (filters.types && filters.types.length) {
      if (!it.type || !filters.types.includes(it.type)) return false;
    }
    if (filters.actors && filters.actors.length) {
      if (!it.actor || !filters.actors.includes(it.actor)) return false;
    }
    if (filters.tags && filters.tags.length) {
      const selectedTags = filters.tags;
      if (!it.tags || !it.tags.some(t => selectedTags.includes(t))) return false;
    }
    return true;
  });
}
