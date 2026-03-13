import { SessionRecord } from './auth-session.model';
import { RefreshFailedError } from './auth-session.errors';

export interface RefreshResult {
  token: string | null;
  exp: number | null;
  user?: SessionRecord['user'] | null;
  claims?: SessionRecord['claims'] | null;
}

export interface RefreshStrategy {
  refresh(current: SessionRecord | null): Promise<RefreshResult>;
}

export class NoRefreshStrategy implements RefreshStrategy {
  async refresh(): Promise<RefreshResult> {
    throw new RefreshFailedError('Refresh not supported by strategy');
  }
}

export class SingleFlightRefresh {
  private inflight: Promise<unknown> | null = null;

  async run<T>(factory: () => Promise<T>): Promise<T> {
    if (!this.inflight) {
      this.inflight = factory().finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight as Promise<T>;
  }
}
