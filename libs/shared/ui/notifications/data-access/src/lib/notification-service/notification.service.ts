import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  NotificationAction,
  NotificationItem,
  NotificationLevel,
} from './notification.model';
import { LocalStorageAdapter, StorageAdapter } from './notification.storage';
import { isToolNotificationEvent, mapToolEventToNotification } from './notification.mapper';

// lightweight uuid fallback if uuid package not available
function uid() {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

type ToolEventsAdapter = { on: (filter?: unknown) => Observable<unknown> };
type ObservabilityAdapter = { trackEvent?: (name: string, meta?: Record<string, unknown>) => void };
type SerializableRecord = Record<string, unknown>;

export interface NotificationServiceConfig {
  maxItems?: number;
  dedupeWindowMs?: number;
  persistence?: boolean;
}

export class NotificationService {
  private notificationsList$ = new BehaviorSubject<NotificationItem[]>([]);
  public notifications$ = this.notificationsList$.asObservable();
  public unreadCount$ = this.notifications$.pipe(map(list => list.filter(i => !i.read).length));

  private storageAdapter: StorageAdapter | null = null;
  private config: Required<NotificationServiceConfig> = {
    maxItems: 100,
    dedupeWindowMs: 5 * 60 * 1000,
    persistence: false,
  };
  private toolEventsSub: Subscription | null = null;
  private observability: ObservabilityAdapter | null = null;

  constructor(
    config?: NotificationServiceConfig,
    storageAdapter?: StorageAdapter,
    toolEventsAdapter?: ToolEventsAdapter,
    observabilityAdapter?: ObservabilityAdapter
  ) {
    this.config = { ...this.config, ...(config ?? {}) };
    this.observability = observabilityAdapter ?? null;
    if (this.config.persistence) {
      this.storageAdapter = storageAdapter ?? new LocalStorageAdapter();
      const loaded = this.storageAdapter.load();
      const normalized = this.normalizeLoadedItems(loaded);
      if (normalized.length) {
        this.notificationsList$.next(normalized);
      }
    }

    // subscribe to ToolEvents contract if provided (non-intrusive adapter)
    if (toolEventsAdapter && typeof toolEventsAdapter.on === 'function') {
      this.toolEventsSub = toolEventsAdapter.on().subscribe((ev: unknown) => {
        const eventType = getEventType(ev);
        try {
          if (!isToolNotificationEvent(ev)) {
            this.observability?.trackEvent?.('notification.toolEvent.ignored', { reason: 'invalid-shape', type: eventType });
            return;
          }
          const n = mapToolEventToNotification(ev);
          this.push(n);
          this.observability?.trackEvent?.('notification.toolEvent', { source: 'tool', type: eventType });
        } catch {
          this.observability?.trackEvent?.('notification.toolEvent.mapError', { type: eventType });
        }
      });
    }
  }

  push(partial: Partial<NotificationItem>): void {
    const item: NotificationItem = {
      id: partial.id ?? uid(),
      level: partial.level ?? NotificationLevel.INFO,
      title: partial.title ?? 'Notification',
      message: partial.message,
      source: partial.source,
      timestamp: partial.timestamp ?? new Date().toISOString(),
      read: partial.read ?? false,
      archive: partial.archive ?? false,
      dedupeKey: partial.dedupeKey,
      correlationId: partial.correlationId,
      action: partial.action,
      payload: partial.payload,
    };

    // sanitize payload before storing/telemetry
    const sanitized = this.sanitizeItem(item);

    const current = this.notificationsList$.getValue();
    const deduped = this.dedupeStrategy(sanitized, current);
    const withRetention = this.applyRetentionPolicy(deduped);
    this.notificationsList$.next(withRetention);
    if (this.storageAdapter) this.storageAdapter.save(this.sanitizeList(forSave(withRetention)));
    this.observability?.trackEvent?.('notification.push', { id: sanitized.id, level: sanitized.level });
  }

  markRead(id: string): void {
    const updated = this.notificationsList$.getValue().map(i => (i.id === id ? { ...i, read: true } : i));
    this.notificationsList$.next(updated);
    if (this.storageAdapter) this.storageAdapter.save(updated);
  }

  markAllRead(): void {
    const updated = this.notificationsList$.getValue().map(i => ({ ...i, read: true }));
    this.notificationsList$.next(updated);
    if (this.storageAdapter) this.storageAdapter.save(updated);
  }

  dismiss(id: string): void {
    const updated = this.notificationsList$.getValue().filter(i => i.id !== id);
    this.notificationsList$.next(updated);
    if (this.storageAdapter) this.storageAdapter.save(updated);
  }

  clearAll(): void {
    this.notificationsList$.next([]);
    if (this.storageAdapter) this.storageAdapter.clear();
  }

  open(ref: string): Observable<NotificationItem | undefined> {
    // For simplicity, expose the notification matching id as observable
    return this.notifications$.pipe(map(list => list.find(i => i.id === ref)));
  }

  private dedupeStrategy(item: NotificationItem, existing: NotificationItem[]): NotificationItem[] {
    if (!item.dedupeKey) {
      return [item, ...existing];
    }
    const now = Date.now();
    const windowMs = this.config.dedupeWindowMs;
    for (let i = 0; i < existing.length; i++) {
      const e = existing[i];
      if (e.dedupeKey === item.dedupeKey) {
        const ts = new Date(e.timestamp).getTime();
        if (now - ts <= windowMs) {
          // update timestamp and message
          const updated = { ...e, timestamp: item.timestamp, message: item.message, payload: item.payload };
          const copy = [...existing];
          copy[i] = updated;
          return copy;
        }
      }
    }
    return [item, ...existing];
  }

  private applyRetentionPolicy(items: NotificationItem[]): NotificationItem[] {
    const limit = this.config.maxItems;
    if (items.length <= limit) return items;
    // remove archived first, then keep most recent by timestamp
    const archived = items.filter(i => i.archive);
    let remaining = [...items];
    if (archived.length) {
      for (const a of archived.reverse()) {
        if (remaining.length <= limit) break;
        const idx = remaining.findIndex(x => x.id === a.id);
        if (idx >= 0) remaining.splice(idx, 1);
      }
    }
    // if still too many, remove oldest by timestamp
    if (remaining.length > limit) {
      remaining = remaining.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    }
    return remaining;
  }

  private sanitizeItem(item: NotificationItem): NotificationItem {
    const p = item.payload;
    let safePayload: NotificationItem['payload'] = p;
    try {
      if (p && typeof p === 'object') {
        const copy: SerializableRecord = {};
        for (const k of Object.keys(p)) {
          if (/(password|ssn|secret|token|credit)/i.test(k)) continue;
          copy[k] = (p as SerializableRecord)[k];
        }
        safePayload = copy;
      }
    } catch {
      safePayload = undefined;
    }
    return { ...item, payload: safePayload };
  }

  private sanitizeList(items: NotificationItem[]): NotificationItem[] {
    return items.map(i => this.sanitizeItem(i));
  }

  private normalizeLoadedItems(input: unknown): NotificationItem[] {
    if (!Array.isArray(input)) return [];
    const normalized = input
      .filter(i => isValidLoadedItem(i))
      .map(i => {
        const item = i as Record<string, unknown>;
        return {
          id: String(item['id']),
          level: isLevel(item['level']) ? (item['level'] as NotificationLevel) : NotificationLevel.INFO,
          title: String(item['title']),
          message: typeof item['message'] === 'string' ? (item['message'] as string) : undefined,
          source: typeof item['source'] === 'string' ? (item['source'] as string) : undefined,
          timestamp: typeof item['timestamp'] === 'string' ? (item['timestamp'] as string) : new Date().toISOString(),
          read: typeof item['read'] === 'boolean' ? (item['read'] as boolean) : false,
          archive: typeof item['archive'] === 'boolean' ? (item['archive'] as boolean) : false,
          dedupeKey: typeof item['dedupeKey'] === 'string' ? (item['dedupeKey'] as string) : undefined,
          correlationId: typeof item['correlationId'] === 'string' ? (item['correlationId'] as string) : undefined,
          action: toNotificationAction(item['action']),
          payload: item['payload'] as Record<string, unknown> | undefined,
        } as NotificationItem;
      });

    return this.sanitizeList(forSave(normalized));
  }

  // helpers: ensure saved list contains only serializable fields (strip functions)
}

function isValidLoadedItem(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item['id'] === 'string' && typeof item['title'] === 'string' && typeof item['timestamp'] === 'string';
}

function isLevel(value: unknown): value is NotificationLevel {
  return typeof value === 'string' && Object.values(NotificationLevel).includes(value as NotificationLevel);
}

function getEventType(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  return typeof record['type'] === 'string' ? (record['type'] as string) : undefined;
}

function toNotificationAction(value: unknown): NotificationAction | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const action = value as Record<string, unknown>;
  if (typeof action['label'] !== 'string' || typeof action['handler'] !== 'string') {
    return undefined;
  }
  return {
    label: action['label'] as string,
    handler: action['handler'] as string,
    refData: action['refData'] as unknown,
  } as NotificationAction;
}

function forSave(items: NotificationItem[]): NotificationItem[] {
  return items.map(i => ({
    id: i.id,
    level: i.level,
    title: i.title,
    message: i.message,
    source: i.source,
    timestamp: i.timestamp,
    read: i.read,
    archive: i.archive,
    dedupeKey: i.dedupeKey,
    correlationId: i.correlationId,
    action: i.action,
    payload: i.payload,
  }));
}

