import { TestBed } from '../../__mocks__/@angular/core/testing'
import { of } from 'rxjs'
import { AuthSessionService } from '@hub/auth-session'
import { ObservabilityService } from '@hub/observability/data-access'
import { SessionService } from './session.service'
import { SessionStatus } from './session.model'

describe('SessionService', () => {
  let service: SessionService

  type AuthSessionStub = {
    session$: unknown
    snapshot: jest.Mock
    restore: jest.Mock
    logout: jest.Mock
  }

  type ObservabilityStub = {
    trackEvent: jest.Mock
  }

  let authSessionMock: AuthSessionStub
  let observabilityMock: ObservabilityStub

  beforeEach(() => {
    authSessionMock = {
      session$: of({
        authenticated: true,
        status: SessionStatus.Authenticated,
        user: { id: '123', name: 'Test User', email: 'test@example.com' },
        claims: { sub: '123', email: 'test@example.com', roles: ['user', 'admin'] },
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      snapshot: jest.fn().mockReturnValue({
        authenticated: true,
        status: SessionStatus.Authenticated,
        user: { id: '123', name: 'Test User', email: 'test@example.com' },
        claims: { sub: '123', email: 'test@example.com', roles: ['user', 'admin'] },
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      restore: jest.fn().mockResolvedValue({
        authenticated: true,
        status: SessionStatus.Authenticated,
        user: { id: '123', name: 'Test User', email: 'test@example.com' },
        claims: { sub: '123', email: 'test@example.com', roles: ['user', 'admin'] },
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
      logout: jest.fn().mockResolvedValue(undefined),
    }

    observabilityMock = {
      trackEvent: jest.fn(),
    }

    TestBed.configureTestingModule({
      providers: [
        SessionService,
        { provide: AuthSessionService, useValue: authSessionMock },
        { provide: ObservabilityService, useValue: observabilityMock },
      ],
    })

    service = TestBed.inject(SessionService)
  })

  describe('snapshot()', () => {
    it('should return consistent SessionSnapshot with authenticated state', () => {
      const snap = service.snapshot()

      expect(snap.authenticated).toBe(true)
      expect(snap.status).toBe(SessionStatus.Authenticated)
      expect(snap.user?.id).toBe('123')
      expect(snap.user?.name).toBe('Test User')
      expect(snap.claims?.sub).toBe('123')
      expect(snap.claims?.roles).toEqual(['user', 'admin'])
    })

    it('should return consistent snapshot on multiple calls', () => {
      const snap1 = service.snapshot()
      const snap2 = service.snapshot()

      expect(snap1.authenticated).toBe(snap2.authenticated)
      expect(snap1.user?.id).toBe(snap2.user?.id)
    })
  })

  describe('isAuthenticated()', () => {
    it('should return true when authenticated', () => {
      expect(service.isAuthenticated()).toBe(true)
    })

    it('should return false when not authenticated', () => {
      authSessionMock.snapshot.mockReturnValue({
        authenticated: false,
        status: SessionStatus.Unauthenticated,
        user: null,
        claims: null,
        exp: null
      })

      expect(service.isAuthenticated()).toBe(false)
    })
  })

  describe('claimsLite()', () => {
    it('should return normalized claims', () => {
      const claims = service.claimsLite()

      expect(claims).not.toBeNull()
      expect(claims?.sub).toBe('123')
      expect(claims?.roles).toEqual(['user', 'admin'])
    })

    it('should return null when claims are null', () => {
      authSessionMock.snapshot.mockReturnValue({
        authenticated: false,
        status: SessionStatus.Unauthenticated,
        user: null,
        claims: null,
        exp: null
      })

      expect(service.claimsLite()).toBeNull()
    })
  })

  describe('session$()', () => {
    it('should emit SessionStateLite from session$ observable', (done) => {
      service.session$().subscribe((state) => {
        expect(state.authenticated).toBe(true)
        expect(state.status).toBe(SessionStatus.Authenticated)
        expect(state.user?.id).toBe('123')
        done()
      })
    })
  })

  describe('restoreOrRefresh()', () => {
    it('should restore session and emit telemetry on success', async () => {
      const result = await service.restoreOrRefresh()

      expect(result.authenticated).toBe(true)
      expect(authSessionMock.restore).toHaveBeenCalled()
      expect(observabilityMock.trackEvent).toHaveBeenCalledWith(
        'session.service.restore',
        expect.objectContaining({ authenticated: true, reason: 'restore_ok' })
      )
    })

    it('should fail and emit telemetry when session expired', async () => {
      const expiredError = new Error('Session Expired')
      authSessionMock.restore.mockRejectedValue(expiredError)

      await expect(service.restoreOrRefresh()).rejects.toThrow()
      expect(observabilityMock.trackEvent).toHaveBeenCalledWith(
        'session.service.restore',
        expect.objectContaining({ authenticated: false, reason: 'session_expired' })
      )
    })

    it('should emit refresh_failed telemetry on refresh error', async () => {
      const refreshError = new Error('Refresh failed to update token')
      authSessionMock.restore.mockRejectedValue(refreshError)

      await expect(service.restoreOrRefresh()).rejects.toThrow()
      expect(observabilityMock.trackEvent).toHaveBeenCalledWith(
        'session.service.restore',
        expect.objectContaining({ reason: 'refresh_failed' })
      )
    })

    it('should emit generic unknown_error telemetry on unexpected error', async () => {
      const unknownError = { some: 'error' }
      authSessionMock.restore.mockRejectedValue(unknownError)

      // Quando o erro rejeitado não é uma instância de Error, o comportamento atual do restoreOrRefresh
      // não garante que haverá throw (depende do authSession). Validamos telemetria apenas.
      await expect(service.restoreOrRefresh()).rejects.toBeDefined()
      expect(observabilityMock.trackEvent).toHaveBeenCalledWith(
        'session.service.restore',
        expect.objectContaining({ reason: 'unknown_error' })
      )
    })
  })

  describe('logout()', () => {
    it('should logout and emit telemetry on success', async () => {
      await service.logout()

      expect(authSessionMock.logout).toHaveBeenCalled()
      expect(observabilityMock.trackEvent).toHaveBeenCalledWith(
        'session.service.logout',
        expect.objectContaining({ reason: 'logout_ok' })
      )
    })

    it('should fail and emit telemetry on logout error', async () => {
      const logoutError = new Error('Logout failed')
      authSessionMock.logout.mockRejectedValue(logoutError)

      await expect(service.logout()).rejects.toThrow()
      expect(observabilityMock.trackEvent).toHaveBeenCalledWith(
        'session.service.logout',
        // extractErrorReason usa error.name quando não encontra padrões específicos.
        expect.objectContaining({ reason: 'Error' })
      )
    })
  })

  describe('claimsLite() normalization', () => {
    it('should normalize roles and groups from claims', () => {
      authSessionMock.snapshot.mockReturnValue({
        authenticated: true,
        status: SessionStatus.Authenticated,
        user: null,
        claims: {
          sub: 'user-123',
          email: 'user@example.com',
          roles: ['viewer', 'editor'],
          groups: ['engineering', 'senior'],
          aud: 'hub-saap',
          iss: 'https://idp.example.com',
          iat: 1640000000,
          exp: 1640003600,
        },
        exp: 1640003600,
      })

      const claims = service.claimsLite()

      expect(claims?.roles).toEqual(['viewer', 'editor'])
      expect(claims?.groups).toEqual(['engineering', 'senior'])
      expect(claims?.sub).toBe('user-123')

      const extra = claims as unknown as Record<string, unknown>
      expect(extra['aud']).toBeUndefined()
      expect(extra['iat']).toBeUndefined()
    })
  })
})
