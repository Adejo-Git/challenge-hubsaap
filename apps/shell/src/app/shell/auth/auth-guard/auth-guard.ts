import { Injectable, inject } from '@angular/core';
import { CanActivate, CanMatch, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot, Route, UrlSegment } from '@angular/router';
import { Observable } from 'rxjs';
import { SessionService } from '@hub/access-layer';
import { ObservabilityService } from '@hub/observability/data-access';
import { buildLoginRedirectUrl } from './auth-redirect.util';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanMatch {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly observability = inject(ObservabilityService);

    canMatch(
      _route: Route,
      segments: UrlSegment[]
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
      // For lazy routes, mimic canActivate logic
      // Compose a fake state.url from segments
      const url = '/' + segments.map(s => s.path).join('/');
      if (this.session.isAuthenticated()) {
        this.observability.trackEvent('GUARD_ALLOW', { reason: 'authenticated' });
        return true;
      }
      return this.session.restoreOrRefresh().then((snap) => {
        const restored = !!snap?.authenticated;
        if (restored && this.session.isAuthenticated()) {
          this.observability.trackEvent('GUARD_ALLOW', { reason: 'session_restored' });
          return true;
        }
        this.observability.trackEvent('GUARD_DENY', { reason: 'not_authenticated' });
        return this.router.parseUrl(buildLoginRedirectUrl(url));
      });
    }

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (this.session.isAuthenticated()) {
      this.observability.trackEvent('GUARD_ALLOW', { reason: 'authenticated' });
      return true;
    }
    // Tenta restaurar sessão
    return this.session.restoreOrRefresh().then((snap) => {
      const restored = !!snap?.authenticated;
      if (restored && this.session.isAuthenticated()) {
        this.observability.trackEvent('GUARD_ALLOW', { reason: 'session_restored' });
        return true;
      }
      // Redireciona para login
      this.observability.trackEvent('GUARD_DENY', { reason: 'not_authenticated' });
      return this.router.parseUrl(buildLoginRedirectUrl(state.url));
    });
  }
}
