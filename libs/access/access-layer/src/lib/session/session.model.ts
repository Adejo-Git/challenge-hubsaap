export enum SessionStatus {
  Unknown = 'unknown',
  Authenticated = 'authenticated',
  Unauthenticated = 'unauthenticated',
  Expired = 'expired',
  Invalid = 'invalid'
}

export interface UserLite {
  id?: string
  name?: string
  email?: string
  [key: string]: string | number | boolean | undefined
}

export interface ClaimsLite {
  sub?: string
  email?: string
  roles?: string[]
  groups?: string[]
  [key: string]: string | string[] | number | boolean | undefined
}

export interface SessionStateLite {
  authenticated: boolean
  status: SessionStatus
  user: UserLite | null
  claims: ClaimsLite | null
  exp: number | null
}

// Snapshot é atualmente igual ao estado, usar alias de tipo evita interface vazia
export type SessionSnapshot = SessionStateLite

export const INITIAL_SESSION_STATE_LITE: SessionStateLite = {
  authenticated: false,
  status: SessionStatus.Unknown,
  user: null,
  claims: null,
  exp: null
}
