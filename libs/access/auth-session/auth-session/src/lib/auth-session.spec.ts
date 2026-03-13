import { AuthSessionService } from './auth-session.service';
import { AuthSessionStorage, StorageService } from './auth-session.storage';
import { SessionRecord, SessionStatus } from './auth-session.model';
import { RefreshStrategy } from './auth-session.strategy';
import { SessionExpiredError, RefreshFailedError } from './auth-session.errors';

// ========== Test Doubles ==========

class InMemoryStorage implements StorageService {
  private data = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | null> {
    return (this.data.get(key) as T) ?? null;
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.data.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}

class FixedTime {
  constructor(private nowMs: number) {}
  now(): number {
    return this.nowMs;
  }
}

class FakeRefreshStrategy implements RefreshStrategy {
  constructor(private result?: { token: string; exp: number }, private shouldFail = false) {}
  async refresh(): Promise<{ token: string; exp: number }> {
    if (this.shouldFail) {
      throw new RefreshFailedError('Refresh failed');
    }
    if (!this.result) {
      throw new RefreshFailedError('No result configured');
    }
    return this.result;
  }
}

class FakeObservabilityService {
  events: Array<{ name: string; metadata?: Record<string, unknown> }> = [];
  track(eventName: string, metadata?: Record<string, unknown>): void {
    this.events.push({ name: eventName, metadata });
  }
  clear(): void {
    this.events = [];
  }
}

function makeRecord(token: string, exp: number, userId = 'u1'): SessionRecord {
  return {
    token,
    exp,
    user: { id: userId },
    claims: { sub: userId },
    status: SessionStatus.Authenticated,
    updatedAt: Date.now()
  };
}

// ========== Test Suites ==========

describe('AuthSessionService', () => {
  describe('restore() - lifecycle initialization', () => {
    it('should restore valid session with correct state', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 2000); // exp in epoch seconds
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000) // time in ms -> 1000 seconds
      );

      const snapshot = await service.restore();

      expect(snapshot.authenticated).toBe(true);
      expect(snapshot.status).toBe(SessionStatus.Authenticated);
      expect(snapshot.exp).toBe(2000);
      expect(snapshot.user?.id).toBe('u1');
      expect(snapshot.claims?.sub).toBe('u1');
    });

    it('should restore empty storage as unauthenticated', async () => {
      const storage = new InMemoryStorage();
      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000)
      );

      const snapshot = await service.restore();

      expect(snapshot.authenticated).toBe(false);
      expect(snapshot.status).toBe(SessionStatus.Unauthenticated);
      expect(snapshot.user).toBeNull();
      expect(snapshot.claims).toBeNull();
    });

    it('should throw SessionExpiredError when session is expired', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 1000); // expires at 1000 seconds
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(2000 * 1000) // now is 2000 seconds > 1000 seconds
      );

      await expect(service.restore()).rejects.toThrow(SessionExpiredError);
    });

    it('should clear storage when session is expired', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 1000);
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(2000 * 1000)
      );

      try {
        await service.restore();
      } catch {
        // Expected
      }

      expect(await storage.get('ns:auth-session')).toBeNull();
    });

    it('should respect refreshSkewSeconds for expiration check', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 1050); // expires at 1050 seconds
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 100 }, // skew = 100 seconds
        new FixedTime(1000 * 1000) // now is 1000 seconds, but 1000 + 100 = 1100 > 1050
      );

      await expect(service.restore()).rejects.toThrow(SessionExpiredError);
    });
  });

  describe('snapshot() - reactive state access', () => {
    it('should return current state as snapshot', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 5000);
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000)
      );
      await service.restore();

      const snapshot = service.snapshot();

      expect(snapshot.authenticated).toBe(true);
      expect(snapshot.exp).toBe(5000);
    });

    it('should return independent copy (mutations do not affect state)', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 5000);
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000)
      );
      await service.restore();

      const snapshot1 = service.snapshot();
      snapshot1.authenticated = false; // Try to mutate

      const snapshot2 = service.snapshot();

      expect(snapshot2.authenticated).toBe(true); // Original unchanged
    });
  });

  describe('getAccessToken() - encapsulated token access', () => {
    it('should return token when session is valid', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('secret-token-xyz', 5000);
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000)
      );
      await service.restore();

      const token = service.getAccessToken();

      expect(token).toBe('secret-token-xyz');
    });

    it('should return null when no session is loaded', async () => {
      const service = new AuthSessionService(
        new AuthSessionStorage(new InMemoryStorage(), { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000)
      );

      const token = service.getAccessToken();

      expect(token).toBeNull();
    });

    it('should return null when session is expired', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 1000);
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(2000 * 1000)
      );
      await service.restore().catch(() => undefined); // Restore will throw, but internal state is still set

      const token = service.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('refresh() - token renewal with single-flight', () => {
    it('should update session record and state on successful refresh', async () => {
      const storage = new InMemoryStorage();
      const initialRecord = makeRecord('token-1', 2000);
      await storage.set('ns:auth-session', initialRecord);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: true, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000),
        undefined,
        new FakeRefreshStrategy({ token: 'token-2', exp: 4000 })
      );
      await service.restore();

      const snapshot = await service.refresh();

      expect(snapshot.authenticated).toBe(true);
      expect(snapshot.exp).toBe(4000);
      expect(service.getAccessToken()).toBe('token-2');
    });

    it('should throw RefreshFailedError when refreshEnabled is false', async () => {
      const service = new AuthSessionService(
        new AuthSessionStorage(new InMemoryStorage(), { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000)
      );

      await expect(service.refresh()).rejects.toThrow(RefreshFailedError);
    });

    it('should throw RefreshFailedError when strategy throws', async () => {
      const service = new AuthSessionService(
        new AuthSessionStorage(new InMemoryStorage(), { namespace: 'ns' }),
        { refreshEnabled: true, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000),
        undefined,
        new FakeRefreshStrategy(undefined, true)
      );

      await expect(service.refresh()).rejects.toThrow();
    });

    it('should throw RefreshFailedError when result has no token or exp', async () => {
      const service = new AuthSessionService(
        new AuthSessionStorage(new InMemoryStorage(), { namespace: 'ns' }),
        { refreshEnabled: true, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000),
        undefined,
        new FakeRefreshStrategy({ token: '', exp: 0 }) // Invalid result
      );

      await expect(service.refresh()).rejects.toThrow(RefreshFailedError);
    });

    it('should coalesce multiple concurrent refresh calls (single-flight)', async () => {
      const storage = new InMemoryStorage();
      const initialRecord = makeRecord('token-1', 2000);
      await storage.set('ns:auth-session', initialRecord);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: true, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000),
        undefined,
        new FakeRefreshStrategy({ token: 'token-2', exp: 4000 })
      );
      await service.restore();

      const [result1, result2, result3] = await Promise.all([
        service.refresh(),
        service.refresh(),
        service.refresh()
      ]);

      // All results are identical (same promise was returned)
      expect(result1.exp).toBe(4000);
      expect(result2.exp).toBe(4000);
      expect(result3.exp).toBe(4000);
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should preserve user and claims from previous record if not in refresh result', async () => {
      const storage = new InMemoryStorage();
      const initialRecord = makeRecord('token-1', 2000);
      await storage.set('ns:auth-session', initialRecord);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: true, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000),
        undefined,
        new FakeRefreshStrategy({ token: 'token-2', exp: 4000 }, false)
      );
      await service.restore();

      const snapshot = await service.refresh();

      expect(snapshot.user?.id).toBe('u1'); // Preserved from initial
      expect(snapshot.claims?.sub).toBe('u1');
    });
  });

  describe('logout() / clear() - session termination', () => {
    it('should clear storage and reset state on logout', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 5000);
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000)
      );
      await service.restore();

      await service.logout();

      expect(await storage.get('ns:auth-session')).toBeNull();
      expect(service.snapshot().authenticated).toBe(false);
      expect(service.getAccessToken()).toBeNull();
    });

    it('should clear storage and reset state on clear', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 5000);
      await storage.set('ns:auth-session', record);

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000)
      );
      await service.restore();

      await service.clear();

      expect(await storage.get('ns:auth-session')).toBeNull();
      const snapshot = service.snapshot();
      expect(snapshot.authenticated).toBe(false);
      expect(snapshot.status).toBe(SessionStatus.Unauthenticated);
    });
  });

  describe('session$ - reactive stream', () => {
    it('should emit state changes through session$ observable', (done) => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 5000);
      let emissionCount = 0;

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000)
      );

      const subscription = service.session$.subscribe((state) => {
        emissionCount++;
        if (emissionCount === 2) {
          // First emission is initial state, second is after restore
          expect(state.authenticated).toBe(true);
          expect(state.status).toBe(SessionStatus.Authenticated);
          subscription.unsubscribe();
          done();
        }
      });

      storage.set('ns:auth-session', record).then(() => service.restore());
    });
  });

  describe('observability - event tracking', () => {
    it('should track session.restore event on successful restore', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 5000);
      await storage.set('ns:auth-session', record);
      const obs = new FakeObservabilityService();

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000),
        obs
      );
      await service.restore();

      const restoreEvent = obs.events.find((e) => e.name === 'session.restore');
      expect(restoreEvent).toBeDefined();
      expect(restoreEvent?.metadata?.result).toBe('ok');
    });

    it('should track session.expired event when restore detects expiry', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 1000);
      await storage.set('ns:auth-session', record);
      const obs = new FakeObservabilityService();

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(2000 * 1000),
        obs
      );

      try {
        await service.restore();
      } catch {
        // Expected
      }

      const expiredEvent = obs.events.find((e) => e.name === 'session.expired');
      expect(expiredEvent).toBeDefined();
      expect(expiredEvent?.metadata?.result).toBe('expired');
    });

    it('should track session.refresh event on successful refresh', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 2000);
      await storage.set('ns:auth-session', record);
      const obs = new FakeObservabilityService();

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: true, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000),
        obs,
        new FakeRefreshStrategy({ token: 'token-2', exp: 4000 })
      );
      await service.restore();
      obs.clear(); // Clear restore events

      await service.refresh();

      const refreshEvent = obs.events.find((e) => e.name === 'session.refresh');
      expect(refreshEvent).toBeDefined();
      expect(refreshEvent?.metadata?.result).toBe('ok');
    });

    it('should track session.logout event on logout', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('token-1', 5000);
      await storage.set('ns:auth-session', record);
      const obs = new FakeObservabilityService();

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000),
        obs
      );
      await service.restore();
      obs.clear(); // Clear restore events

      await service.logout();

      const logoutEvent = obs.events.find((e) => e.name === 'session.logout');
      expect(logoutEvent).toBeDefined();
      expect(logoutEvent?.metadata?.result).toBe('ok');
    });

    it('should never expose sensitive data in observability events', async () => {
      const storage = new InMemoryStorage();
      const record = makeRecord('SECRET-TOKEN-DO-NOT-EXPOSE', 5000);
      await storage.set('ns:auth-session', record);
      const obs = new FakeObservabilityService();

      const service = new AuthSessionService(
        new AuthSessionStorage(storage, { namespace: 'ns' }),
        { refreshEnabled: false, refreshSkewSeconds: 0 },
        new FixedTime(1000 * 1000),
        obs
      );
      await service.restore();

      // Verify no event contains the token
      obs.events.forEach((e) => {
        const eventStr = JSON.stringify(e);
        expect(eventStr).not.toContain('SECRET-TOKEN');
        expect(eventStr).not.toContain('DO-NOT-EXPOSE');
      });
    });
  });
});
