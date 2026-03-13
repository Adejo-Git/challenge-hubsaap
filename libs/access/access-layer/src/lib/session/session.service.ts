import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { AuthSessionService } from '@hub/auth-session'
import { ObservabilityService } from '@hub/observability/data-access'
import { SessionStateLite, SessionSnapshot, ClaimsLite } from './session.model'
import { mapSessionStateToLite } from './session.adapters'

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  constructor(
    private authSession: AuthSessionService,
    private observability: ObservabilityService
  ) {}

  session$(): Observable<SessionStateLite> {
    return this.authSession.session$.pipe(map((state) => mapSessionStateToLite(state)))
  }

  snapshot(): SessionSnapshot {
    const raw = this.authSession.snapshot()
    return mapSessionStateToLite(raw)
  }

  isAuthenticated(): boolean {
    return this.snapshot().authenticated
  }

  claimsLite(): ClaimsLite | null {
    return this.snapshot().claims
  }

  async restoreOrRefresh(): Promise<SessionSnapshot> {
    try {
      const restored = await this.authSession.restore()
      this.observability.trackEvent('session.service.restore', {
        authenticated: restored.authenticated,
        reason: 'restore_ok'
      })
      return mapSessionStateToLite(restored)
    } catch (error) {
      const reason = this.extractErrorReason(error)
      this.observability.trackEvent('session.service.restore', {
        authenticated: false,
        reason
      })
      throw error
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authSession.logout()
      this.observability.trackEvent('session.service.logout', {
        reason: 'logout_ok'
      })
    } catch (error) {
      const reason = this.extractErrorReason(error)
      this.observability.trackEvent('session.service.logout', {
        reason
      })
      throw error
    }
  }

  private extractErrorReason(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('Expired')) return 'session_expired'
      if (error.message.includes('Refresh')) return 'refresh_failed'
      if (error.message.includes('Invalid')) return 'invalid_session'
      return error.name || 'unknown_error'
    }
    return 'unknown_error'
  }
}
