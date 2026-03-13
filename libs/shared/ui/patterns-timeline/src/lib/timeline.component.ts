import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges } from '@angular/core';
import {
  TimelineItem,
  GroupBy,
  SortDirection,
  RendererTemplates,
  TimelineState,
  FilterConfig,
  UIOptions,
  TimelineGroup,
} from './timeline.model';
import { groupItems } from './timeline.grouping';
import { applyFilters } from './timeline.filters';
import { UiThemeService } from '@hub/shared/ui-theme';
import { formatTimestamp } from './timeline.format';
import { StandardError } from '@hub/error-model';

type TimelineVirtualRow =
  | { kind: 'group'; key: string; label: string }
  | { kind: 'item'; key: string; item: TimelineItem };

@Component({
  selector: 'patterns-timeline',
  standalone: false,
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimelineComponent implements OnChanges {
  readonly defaultVirtualScrollMinItems = 200;
  readonly defaultVirtualScrollItemSize = 72;
  readonly defaultVirtualScrollHeightPx = 480;

  @Input() items: TimelineItem[] = [];
  @Input() groupBy: GroupBy = 'day';
  @Input() sortDirection: SortDirection = 'desc';
  @Input() filters?: FilterConfig;
  @Input() renderers?: RendererTemplates;
  @Input() state: TimelineState = 'ready';
  @Input() error?: StandardError;
  @Input() uiOptions?: UIOptions;
  @Input() itemAriaLabelBuilder?: (item: TimelineItem) => string;

  @Output() filterChange = new EventEmitter<FilterConfig>();
  @Output() itemClick = new EventEmitter<TimelineItem>();
  @Output() loadMore = new EventEmitter<void>();

  grouped: TimelineGroup[] = [];
  virtualRows: TimelineVirtualRow[] = [];
  private groupedAllItems: TimelineGroup[] = [];
  selectedFilters: FilterConfig = {};
  readonly activeThemeKey: string;

  constructor(private readonly uiThemeService: UiThemeService) {
    this.activeThemeKey = this.uiThemeService.snapshot().key;
  }

  ngOnChanges() {
    this.selectedFilters = {
      types: this.filters?.types ? [...this.filters.types] : [],
      actors: this.filters?.actors ? [...this.filters.actors] : [],
      tags: this.filters?.tags ? [...this.filters.tags] : [],
    };
    this.recompute();
  }

  private recompute() {
    const filtered = applyFilters(this.items || [], this.selectedFilters);
    this.groupedAllItems = groupItems(filtered, this.groupBy, this.sortDirection, {
      dayTimezone: this.uiOptions?.dayGroupingTimezone ?? 'local',
    });
    this.grouped = this.limitByMaxItems(this.groupedAllItems, this.uiOptions?.maxItems);
    this.virtualRows = this.createVirtualRows(this.grouped);
  }

  private createVirtualRows(groups: TimelineGroup[]): TimelineVirtualRow[] {
    const rows: TimelineVirtualRow[] = [];

    for (const group of groups) {
      rows.push({ kind: 'group', key: `group:${group.key}`, label: group.label });

      for (const item of group.items) {
        rows.push({ kind: 'item', key: `item:${group.key}:${item.id}`, item });
      }
    }

    return rows;
  }

  private limitByMaxItems(groups: TimelineGroup[], maxItems?: number): TimelineGroup[] {
    if (!maxItems || maxItems <= 0) {
      return groups;
    }

    let remaining = maxItems;
    const limited: TimelineGroup[] = [];

    for (const group of groups) {
      if (remaining <= 0) {
        break;
      }

      const items = group.items.slice(0, remaining);
      if (items.length > 0) {
        limited.push({ ...group, items });
      }
      remaining -= items.length;
    }

    return limited;
  }

  private countItems(groups: TimelineGroup[]): number {
    return groups.reduce((total, group) => total + group.items.length, 0);
  }

  get showEmptyState(): boolean {
    if (this.state === 'empty') {
      return true;
    }

    return this.grouped.length === 0 || this.grouped.every((group) => group.items.length === 0);
  }

  get showReadyState(): boolean {
    return this.state === 'ready' || this.state === 'empty';
  }

  get canLoadMore(): boolean {
    if (!this.uiOptions?.maxItems) {
      return false;
    }

    return this.countItems(this.groupedAllItems) > this.countItems(this.grouped);
  }

  get useVirtualScroll(): boolean {
    if (this.uiOptions?.enableVirtualScroll === false) {
      return false;
    }

    const minItems = this.uiOptions?.virtualScrollMinItems ?? this.defaultVirtualScrollMinItems;
    return this.countItems(this.grouped) >= minItems;
  }

  get virtualScrollItemSize(): number {
    return this.uiOptions?.virtualScrollItemSize ?? this.defaultVirtualScrollItemSize;
  }

  get virtualScrollHeightPx(): number {
    return this.uiOptions?.virtualScrollHeightPx ?? this.defaultVirtualScrollHeightPx;
  }

  onItemClick(it?: TimelineItem) {
    if (!it) {
      return;
    }

    this.itemClick.emit(it);
  }

  onFilterChange(cfg: FilterConfig) {
    this.selectedFilters = {
      types: cfg.types ? [...cfg.types] : [],
      actors: cfg.actors ? [...cfg.actors] : [],
      tags: cfg.tags ? [...cfg.tags] : [],
    };
    this.recompute();
    this.filterChange.emit(cfg);
  }

  onLoadMore() {
    this.loadMore.emit();
  }

  getItemAriaLabel(item?: TimelineItem): string {
    if (!item) {
      return 'Abrir evento';
    }

    if (this.itemAriaLabelBuilder) {
      return this.itemAriaLabelBuilder(item);
    }

    return `Abrir evento: ${item.title}`;
  }

  formatItemTimestamp(timestamp: string): string {
    return formatTimestamp(timestamp);
  }

  trackByGroup(_index: number, group: TimelineGroup): string {
    return group.key;
  }

  trackByItem(_index: number, item: TimelineItem): string {
    return item.id;
  }

  trackByVirtualRow(_index: number, row: TimelineVirtualRow): string {
    return row.key;
  }
}
