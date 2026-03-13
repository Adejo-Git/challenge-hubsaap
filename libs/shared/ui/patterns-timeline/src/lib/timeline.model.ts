import { TemplateRef } from '@angular/core';

export type SortDirection = 'asc' | 'desc';

export interface TimelineItem {
  id: string;
  timestamp: string; // ISO
  title: string;
  description?: string;
  actor?: string;
  type?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export type GroupBy = 'none' | 'day' | 'actor' | 'type';

export interface TimelineGroup {
  key: string;
  label: string;
  items: TimelineItem[];
}

export interface FilterConfig {
  types?: string[];
  tags?: string[];
  actors?: string[];
}

export interface RendererTemplates {
  itemHeader?: TemplateRef<unknown>;
  itemBody?: TemplateRef<unknown>;
  itemFooter?: TemplateRef<unknown>;
}

export type TimelineState = 'loading' | 'ready' | 'empty' | 'error';

export interface UIOptions {
  compact?: boolean;
  showAvatars?: boolean;
  showTags?: boolean;
  maxItems?: number;
  stickyGroupHeaders?: boolean;
  dayGroupingTimezone?: 'local' | 'utc';
  enableVirtualScroll?: boolean;
  virtualScrollMinItems?: number;
  virtualScrollItemSize?: number;
  virtualScrollHeightPx?: number;
}
