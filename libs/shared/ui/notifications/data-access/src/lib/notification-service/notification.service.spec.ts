import { BehaviorSubject, of } from 'rxjs';
import { NotificationService } from './notification.service';
import { NotificationItem, NotificationLevel } from './notification.model';
import { LocalStorageAdapter, StorageAdapter, WindowStorageRef } from './notification.storage';

type NotificationServiceTestAccess = NotificationService & {
  notificationsList$: BehaviorSubject<NotificationItem[]>;
};

type LocalStorageMock = WindowStorageRef['localStorage'];

const getList = (svc: NotificationService): NotificationItem[] =>
  (svc as NotificationServiceTestAccess).notificationsList$.getValue();

const toError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));

class MockStorage implements StorageAdapter {
  saved: NotificationItem[] = [];
  cleared = false;

  constructor(private readonly toLoad: unknown[] = []) {}

  load(): unknown[] {
    return this.toLoad;
  }

  save(items: NotificationItem[]): void {
    this.saved = items;
  }

  clear(): void {
    this.cleared = true;
  }
}

describe('NotificationService basic flows', () => {
  it('push adds item and sets id/timestamp', () => {
    const svc = new NotificationService();
    svc.push({ title: 'Hello' });
    const list = getList(svc);
    expect(list.length).toBe(1);
    expect(list[0].id).toBeDefined();
    expect(list[0].timestamp).toBeDefined();
  });

  it('markRead updates unread count', done => {
    const svc = new NotificationService();
    svc.push({ title: 'a' });
    const id = getList(svc)[0].id;
    svc.unreadCount$.subscribe(count => {
      // after push unread=1 then after markRead -> 0
      if (count === 0) done();
    });
    svc.markRead(id);
  });

  it('dedupe updates existing within window', () => {
    const svc = new NotificationService({ dedupeWindowMs: 10000 });
    svc.push({ title: '1', dedupeKey: 'k1', message: 'first' });
    svc.push({ title: '1', dedupeKey: 'k1', message: 'second' });
    const list = getList(svc);
    expect(list.length).toBe(1);
    expect(list[0].message).toBe('second');
  });

  it('dismiss removes item', () => {
    const svc = new NotificationService();
    svc.push({ title: 'x' });
    const id = getList(svc)[0].id;
    svc.dismiss(id);
    const list = getList(svc);
    expect(list.length).toBe(0);
  });

  it('markAllRead sets all items as read and updates unreadCount', done => {
    const svc = new NotificationService();
    svc.push({ title: 'a' });
    svc.push({ title: 'b' });
    // unread should be 2 initially, then 0 after markAllRead
    let seenOnce = false;
    svc.unreadCount$.subscribe(count => {
      if (!seenOnce) { seenOnce = true; return; }
      try {
        expect(count).toBe(0);
        done();
      } catch (error) {
        done(toError(error));
      }
    });
    svc.markAllRead();
  });

  it('clearAll removes items and clears storage when adapter provided', () => {
    const mock = new MockStorage();
    const svc = new NotificationService({ persistence: true }, mock);
    svc.push({ title: 'one' });
    expect(getList(svc).length).toBe(1);
    svc.clearAll();
    expect(getList(svc).length).toBe(0);
    expect(mock.cleared).toBe(true);
  });

  it('retention policy removes oldest items when exceeding maxItems', () => {
    const svc = new NotificationService({ maxItems: 2 });
    // push three items with explicit timestamps so we control order
    svc.push({ id: 'i1', title: 'old', timestamp: '2020-01-01T00:00:00.000Z' });
    svc.push({ id: 'i2', title: 'mid', timestamp: '2020-01-02T00:00:00.000Z' });
    svc.push({ id: 'i3', title: 'new', timestamp: '2020-01-03T00:00:00.000Z' });
    const list = getList(svc);
    expect(list.length).toBe(2);
    // ensure the newest two remain (i3 and i2)
    const ids = list.map((item) => item.id);
    expect(ids).toContain('i3');
    expect(ids).toContain('i2');
    expect(ids).not.toContain('i1');
  });

  it('loads persisted items from storage on construction', () => {
    const existing: NotificationItem[] = [
      {
        id: 'existing',
        title: 'restored',
        timestamp: new Date().toISOString(),
        read: false,
        archive: false,
        level: NotificationLevel.INFO,
      },
    ];
    const mock = new MockStorage(existing);
    const svc = new NotificationService({ persistence: true }, mock);
    const list = getList(svc);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('existing');
  });

  it('storage.save skips persisting when serialized payload exceeds maxBytes', () => {
    // mock window.localStorage to observe setItem calls
    const calls: string[] = [];
    const localStorageMock: LocalStorageMock = {
      getItem: (key: string) => {
        void key;
        return null;
      },
      setItem: (key: string, value: string) => {
        void key;
        calls.push(value);
      },
      removeItem: (key: string) => {
        void key;
      },
    };
    const mockWindow: WindowStorageRef = { localStorage: localStorageMock };

    const adapter = new LocalStorageAdapter('test.notifications', mockWindow);
    // create an item with very large payload to exceed 1MB threshold
    const big = 'x'.repeat(1024 * 1024 + 1000);
    const items: NotificationItem[] = [{
      id: 'big',
      title: 'big',
      timestamp: new Date().toISOString(),
      level: NotificationLevel.INFO,
      payload: { big },
    }];
    adapter.save(items);
    // adapter should skip persisting, so setItem not called
    expect(calls.length).toBe(0);
  });

  it('storage.load respects schema versioning (ignores older schema keys)', () => {
    // simulate localStorage containing an older schema key
    const oldKey = 'hub.notifications:v0';
    const store: Record<string, string> = {};
    store[oldKey] = JSON.stringify([{ id: 'old', title: 'old' }]);

    const localStorageMock: LocalStorageMock = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    };
    const mockWindow: WindowStorageRef = { localStorage: localStorageMock };

    const adapter = new LocalStorageAdapter(undefined, mockWindow);
    const loaded = adapter.load();
    // since adapter uses schema v1, it should not read v0 key and return empty
    expect(loaded).toEqual([]);
  });

  it('ignores invalid tool events and tracks telemetry', () => {
    const trackEvent = jest.fn();
    const toolEventsAdapter = {
      on: () => of(42 as const),
    };
    const svc = new NotificationService(undefined, undefined, toolEventsAdapter, { trackEvent });
    const list = getList(svc);
    expect(list.length).toBe(0);
    expect(trackEvent).toHaveBeenCalledWith('notification.toolEvent.ignored', { reason: 'invalid-shape', type: undefined });
  });

  it('drops invalid persisted items on construction', () => {
    const existing: unknown[] = [
      { id: 'ok', title: 'restored', timestamp: new Date().toISOString(), read: false, archive: false },
      { id: 'bad-no-title', timestamp: new Date().toISOString() },
      { id: 'bad-no-ts', title: 'missing-ts' },
    ];
    const mock = new MockStorage(existing);
    const svc = new NotificationService({ persistence: true }, mock);
    const list = getList(svc);
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('ok');
  });
});
