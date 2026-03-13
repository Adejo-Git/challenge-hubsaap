export enum SessionStatus {
  Unknown = 'unknown',
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated',
  Expired = 'expired',
  Invalid = 'invalid'
}

export interface ClaimsLite {
  sub?: string;
  email?: string;
  roles?: string[];
  [key: string]: string | string[] | number | boolean | undefined;
}

export interface UserProfileLite {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface SessionState {
  authenticated: boolean;
  status: SessionStatus;
  user: UserProfileLite | null;
  claims: ClaimsLite | null;
  exp: number | null; // epoch seconds
}

export const INITIAL_SESSION_STATE: SessionState = {
  authenticated: false,
  status: SessionStatus.Unknown,
  user: null,
  claims: null,
  exp: null
};

export interface SessionSnapshot {
  authenticated: boolean;
  status: SessionStatus;
  user: UserProfileLite | null;
  claims: ClaimsLite | null;
  exp: number | null;
}

export interface SessionRecord {
  token: string | null;
  exp: number | null;
  user: UserProfileLite | null;
  claims: ClaimsLite | null;
  status: SessionStatus;
  updatedAt: number;
}
