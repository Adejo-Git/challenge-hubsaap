import { BehaviorSubject, Observable } from 'rxjs';
import {
  INITIAL_SESSION_STATE,
  SessionRecord,
  SessionSnapshot,
  SessionState,
  SessionStatus
} from './auth-session.model';
import { AuthSessionStorage } from './auth-session.storage';
// import { InvalidSessionError } from './auth-session.errors'; // Comentado pelo validator - não utilizado
import { RefreshFailedError, SessionExpiredError } from './auth-session.errors';
import { isExpired, SystemTime, TimeProvider } from './auth-session.util';
import { NoRefreshStrategy, RefreshResult, RefreshStrategy, SingleFlightRefresh } from './auth-session.strategy';

export interface RuntimeConfig {
  refreshEnabled?: boolean;
  refreshSkewSeconds?: number;
}

export interface ObservabilityService {
  track(eventName: string, metadata?: Record<string, unknown>): void;
}

export class AuthSessionService {
  private readonly state$ = new BehaviorSubject<SessionState>({ ...INITIAL_SESSION_STATE });
  private readonly refreshGate = new SingleFlightRefresh();
  private record: SessionRecord | null = null;
  private accessToken: string | null = null;

  constructor(
    private storage: AuthSessionStorage,
    private config: RuntimeConfig,
    private time: TimeProvider = SystemTime,
    private observability?: ObservabilityService,
    private strategy: RefreshStrategy = new NoRefreshStrategy()
  ) {}

  get session$(): Observable<SessionState> {
    return this.state$.asObservable();
  }

  snapshot(): SessionSnapshot {
    const current = this.state$.getValue();
    return { ...current };
  }

  async restore(): Promise<SessionSnapshot> {
    const raw = await this.storage.read();
    if (!raw) {
      this.setState({ ...INITIAL_SESSION_STATE, status: SessionStatus.Unauthenticated });
      this.observability?.track('session.restore', { result: 'empty' });
      return this.snapshot();
    }

    if (isExpired(raw.exp, this.time, this.config.refreshSkewSeconds ?? 0)) {
      await this.storage.clear();
      this.clearLocal();
      this.setState({ ...INITIAL_SESSION_STATE, status: SessionStatus.Expired });
      this.observability?.track('session.expired', { result: 'expired' });
      this.observability?.track('session.restore', { result: 'expired' });
      throw new SessionExpiredError();
    }

    this.record = raw;
    this.accessToken = raw.token ?? null;
    this.setState({
      authenticated: true,
      status: SessionStatus.Authenticated,
      user: raw.user ?? null,
      claims: raw.claims ?? null,
      exp: raw.exp ?? null
    });
    this.observability?.track('session.restore', { result: 'ok' });
    return this.snapshot();
  }

  getAccessToken(): string | null {
    if (!this.record) {
      return null;
    }
    if (isExpired(this.record.exp, this.time, this.config.refreshSkewSeconds ?? 0)) {
      return null;
    }
    return this.accessToken;
  }

  async refresh(): Promise<SessionSnapshot> {
    if (!this.config.refreshEnabled) {
      throw new RefreshFailedError('Refresh disabled');
    }
    return this.refreshGate.run(async () => {
      try {
        const result: RefreshResult = await this.strategy.refresh(this.record);
        const next: SessionRecord = {
          token: result.token ?? null,
          exp: result.exp ?? null,
          user: result.user ?? this.record?.user ?? null,
          claims: result.claims ?? this.record?.claims ?? null,
          status: SessionStatus.Authenticated,
          updatedAt: this.time.now()
        };
        if (!next.token || !next.exp) {
          throw new RefreshFailedError('Refresh returned invalid data');
        }
        this.record = next;
        this.accessToken = next.token;
        await this.storage.write(next);
        this.setState({
          authenticated: true,
          status: SessionStatus.Authenticated,
          user: next.user,
          claims: next.claims,
          exp: next.exp
        });
        this.observability?.track('session.refresh', { result: 'ok' });
        return this.snapshot();
      } catch (err) {
        this.observability?.track('session.refresh', { result: 'fail' });
        throw err instanceof Error ? err : new RefreshFailedError();
      }
    });
  }

  async logout(): Promise<void> {
    await this.clear();
    this.observability?.track('session.logout', { result: 'ok' });
  }

  async clear(): Promise<void> {
    await this.storage.clear();
    this.clearLocal();
    this.setState({ ...INITIAL_SESSION_STATE, status: SessionStatus.Unauthenticated });
  }

  private clearLocal(): void {
    this.record = null;
    this.accessToken = null;
  }

  private setState(state: SessionState): void {
    this.state$.next(state);
  }
}
