import { NotificationItem } from './notification.model';

export type WindowStorageRef = {
  localStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
};

type PersistedNotificationRecord = Record<string, unknown>;

export interface StorageAdapter {
  save(items: NotificationItem[]): Promise<void> | void;
  load(): Promise<unknown[]> | unknown[];
  clear(): Promise<void> | void;
}

function swallowStorageError(): void {
  return;
}

export class LocalStorageAdapter implements StorageAdapter {
  private key: string;
  private maxBytes = 1024 * 1024; // 1MB
  private schema = 'v1';

  constructor(storageKey = 'hub.notifications', private windowRef: WindowStorageRef = window) {
    this.key = `${storageKey}:${this.schema}`;
  }

  load(): unknown[] {
    try {
      const raw = this.windowRef.localStorage.getItem(this.key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      // Corrupted storage - fallback to empty
      try {
        this.windowRef.localStorage.removeItem(this.key);
      } catch (storageError) {
        swallowStorageError();
      }
      return [];
    }
  }

  save(items: NotificationItem[]): void {
    try {
      // last-resort sanitization: remove suspicious keys from payloads
      const cleaned = items.map((item) => {
        const payload = item.payload;
        let safePayload: NotificationItem['payload'] = payload;
        try {
          if (payload && typeof payload === 'object') {
            const sanitizedPayload: PersistedNotificationRecord = {};
            for (const key of Object.keys(payload)) {
              if (/(password|ssn|secret|token|credit)/i.test(key)) continue;
              sanitizedPayload[key] = (payload as PersistedNotificationRecord)[key];
            }
            safePayload = sanitizedPayload;
          }
        } catch {
          safePayload = undefined;
        }
        return { ...item, payload: safePayload };
      });
      const serialized = JSON.stringify(cleaned);
      if (serialized.length > this.maxBytes) {
        // skip persisting if too large
        return;
      }
      this.windowRef.localStorage.setItem(this.key, serialized);
    } catch {
      // ignore: quota exceeded or storage unavailable
    }
  }

  clear(): void {
    try {
      this.windowRef.localStorage.removeItem(this.key);
    } catch (storageError) {
      swallowStorageError();
    }
  }
}
