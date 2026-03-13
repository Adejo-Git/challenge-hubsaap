import { SessionRecord, SessionStatus } from './auth-session.model';

export interface TimeProvider {
  now(): number; // epoch ms
}

export const SystemTime: TimeProvider = {
  now: () => Date.now()
};

export function toEpochSeconds(value: number): number {
  return Math.floor(value / 1000);
}

export function isExpired(expSeconds: number | null, time: TimeProvider, skewSeconds = 0): boolean {
  if (!expSeconds) {
    return true;
  }
  const nowSeconds = toEpochSeconds(time.now());
  return nowSeconds + skewSeconds >= expSeconds;
}

export function normalizeRecord(raw: Partial<SessionRecord> | null): SessionRecord | null {
  if (!raw) {
    return null;
  }
  const statusValues = Object.values(SessionStatus);
  const safeStatus = statusValues.includes(raw.status as SessionStatus)
    ? (raw.status as SessionStatus)
    : SessionStatus.Unknown;
  return {
    token: raw.token ?? null,
    exp: raw.exp ?? null,
    user: raw.user ?? null,
    claims: raw.claims ?? null,
    status: safeStatus,
    updatedAt: raw.updatedAt ?? 0
  } as SessionRecord;
}
