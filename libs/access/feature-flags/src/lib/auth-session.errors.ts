export class SessionExpiredError extends Error {
  readonly code = 'SESSION_EXPIRED';
  constructor(message = 'Session expired') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

export class RefreshFailedError extends Error {
  readonly code = 'REFRESH_FAILED';
  constructor(message = 'Refresh failed') {
    super(message);
    this.name = 'RefreshFailedError';
  }
}

export class InvalidSessionError extends Error {
  readonly code = 'INVALID_SESSION';
  constructor(message = 'Invalid session') {
    super(message);
    this.name = 'InvalidSessionError';
  }
}

// Mapeamento mínimo para integração com error-model
export const AuthSessionErrorModel = {
  SessionExpired: 'SessionExpired',
  RefreshFailed: 'RefreshFailed',
  InvalidSession: 'InvalidSession'
} as const;
