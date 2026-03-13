import { Component, OnInit, signal, inject, DestroyRef, Injector, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, switchMap, tap, catchError, of, debounceTime, filter, firstValueFrom } from 'rxjs';
import { setupRouterEvents } from '../router/router-events';
import { NotificationCenterComponent } from '../notifications/notification-center/notification-center.component';
import { ErrorPageDetails, UiErrorPageComponentModule } from '@hub/shared/ui-error-page';
import { NavigationService } from '@hub/access-layer';
import { ContextService } from '@hub/access-layer';
import { SessionService } from '@hub/access-layer';
import { ObservabilityService } from '@hub/observability/data-access';
import { getDefaultDevContext } from '../../app.config';

// Small type-guard helper for thenable/Promise-like values
function isThenable(v: unknown): v is PromiseLike<unknown> {
  return v !== null && typeof v === 'object' && typeof (v as PromiseLike<unknown>).then === 'function';
}

// Lightweight shapes used by the Shell for binding only (keeps access decisions in Access Layer)
type SessionUserLite = {
  id: string
  name: string
  email?: string
  roles?: string[]
}

type SessionStateLite = {
  user?: SessionUserLite | null
}

type AppContextLite = {
  tenantId: string
  clienteId?: string | null
  projetoId?: string | null
  environment?: string
} & Record<string, unknown>

type BreadcrumbLite = Record<string, unknown>

type NavItemLite = Record<string, unknown>

type MenuGroupLite = {
  items?: readonly unknown[]
}

type NavigationMenuLite = {
  groups?: readonly MenuGroupLite[]
}

type ObservableOrFactory<T> = Observable<T> | (() => Observable<T>) | null | undefined

type NavigationFacadeLite = {
  menu$?: ObservableOrFactory<NavigationMenuLite>
  breadcrumbs$?: ObservableOrFactory<BreadcrumbLite[]>
  activeItem$?: ObservableOrFactory<NavItemLite | null>
  rebuild?: () => void
}

type SessionSnapshotLite = SessionStateLite & {
  userId?: string
}

type SessionFacadeLite = {
  session$?: ObservableOrFactory<SessionStateLite | null>
  restoreOrRefresh?: () => Promise<SessionSnapshotLite>
  logout?: () => void | Promise<void>
}

type ContextSwitchOptions = {
  source: string
  persist: boolean
}

type ContextFacadeLite = {
  restoreFromStorage?: () => Promise<unknown> | unknown
  snapshot?: () => AppContextLite | null
  context$?: ObservableOrFactory<AppContextLite | null>
  setContext?: (ctx: AppContextLite, options: ContextSwitchOptions) => Promise<void> | void
}

type ErrorLike = {
  message?: string
  status?: number
}

/**
 * AppShellComponent
 *
 * Root shell component — orchestrates bootstrap flow using Access Layer facades.
 */
@Component({
  selector: 'hub-app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    NotificationCenterComponent,
    UiErrorPageComponentModule,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent implements OnInit {
  // Injeção de dependências (real services)
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);
  private readonly contextService = inject(ContextService);
  // Resolve NavigationService lazily from injector to avoid heavy instantiation in tests
  private readonly injector = inject(Injector);
  private navigationService: NavigationService | null = null;
  private readonly observability = inject(ObservabilityService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  public readonly isLoading = signal<boolean>(false);
  public readonly hasError = signal<boolean>(false);
  public readonly errorDetails = signal<ErrorPageDetails | null>(null);
  public readonly isBootstrapComplete = signal<boolean>(false);
  public readonly currentUser = signal<SessionUserLite | null>(null);
  public readonly activeContext = signal<AppContextLite | null>(null);
  public readonly navigationTree = signal<unknown[]>([]);
  public readonly breadcrumbs = signal<BreadcrumbLite[]>([]);
  public readonly activeItem = signal<NavItemLite | null>(null);

  ngOnInit(): void {
    this.navigationService = this.resolveNavigationService();
    setupRouterEvents(this.router, this.observability);

    this.setupSessionStreams();
    this.setupContextChangeListener();
    this.setupNavigationStreams();

    void this.executeBootstrap();
  }

  private get sessionFacade(): SessionFacadeLite {
    return this.session as unknown as SessionFacadeLite;
  }

  private get contextFacade(): ContextFacadeLite {
    return this.contextService as unknown as ContextFacadeLite;
  }

  private get navigationFacade(): NavigationFacadeLite | null {
    return this.navigationService as unknown as NavigationFacadeLite | null;
  }

  private resolveNavigationService(): NavigationService | null {
    try {
      return this.injector.get(NavigationService);
    } catch {
      return null;
    }
  }

  private resolveObservable<T>(maybe: ObservableOrFactory<T>, thisArg?: unknown): Observable<T> | undefined {
    return typeof maybe === 'function' ? maybe.call(thisArg) : maybe ?? undefined;
  }

  private countNavigationItems(navigation: NavigationMenuLite): number {
    return (navigation.groups ?? []).reduce(
      (sum, group) => sum + (group.items?.length ?? 0),
      0
    );
  }

  private getErrorLike(error: unknown): ErrorLike {
    return typeof error === 'object' && error !== null ? (error as ErrorLike) : {};
  }

  private setupSessionStreams(): void {
    const session$ = this.resolveObservable(this.sessionFacade.session$, this.session);
    if (!session$) {
      return;
    }

    try {
      session$
        .pipe(
          filter((sessionState): sessionState is SessionStateLite => sessionState != null),
          tap((sessionState) => {
            if (sessionState.user) {
              this.currentUser.set({
                id: sessionState.user.id,
                name: sessionState.user.name,
                email: sessionState.user.email ?? '',
                roles: sessionState.user.roles ?? [],
              });
            }
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe();
    } catch {
      // se session$ não existir ou não for observable, ignora
    }
  }

  public async executeBootstrap(): Promise<void> {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.errorDetails.set(null);

    const startTime = performance.now();
    this.observability.trackEvent('bootstrap.start');

    try {
      const snapshot = await this.sessionFacade.restoreOrRefresh?.();
      const sessionDuration = performance.now() - startTime;

      if (snapshot?.user) {
        this.currentUser.set({
          id: snapshot.user.id,
          name: snapshot.user.name,
          email: snapshot.user.email ?? '',
          roles: snapshot.user.roles ?? [],
        });
      }

      this.observability.trackEvent('bootstrap.session.success', {
        userId: snapshot?.user?.id ?? snapshot?.userId,
        duration: sessionDuration,
      });

      const restoreRes = this.contextFacade.restoreFromStorage?.();
      if (isThenable(restoreRes)) {
        await restoreRes;
      }

      let ctx = this.contextFacade.snapshot?.();
      if (!ctx) {
        // Attempt a bootstrap-only fallback: apply a minimal dev context so Shell doesn't crash when no persisted context exists.
        try {
          const fallback = getDefaultDevContext();
          const setRes = this.contextFacade.setContext?.(fallback as AppContextLite, { source: 'bootstrap', persist: false });
          if (isThenable(setRes)) {
            await setRes;
          }
        } catch (e) {
          // ignore here; will re-check snapshot below and throw if still missing
        }

        ctx = this.contextFacade.snapshot?.();
      }
      if (!ctx) {
        throw new Error('Context restoration failed: no context available');
      }

      const contextDuration = performance.now() - startTime;
      this.activeContext.set({
        tenantId: ctx.tenantId,
        clienteId: ctx.clienteId ?? null,
        projetoId: ctx.projetoId ?? null,
        environment: ctx.environment ?? 'dev',
      });

      this.observability.trackEvent('bootstrap.context.success', {
        tenantId: ctx.tenantId,
        clienteId: ctx.clienteId,
        duration: contextDuration,
      });

      this.navigationFacade?.rebuild?.();
      this.observability.trackEvent('navigation_rebuild_triggered');

      const menu$ = this.resolveObservable(this.navigationFacade?.menu$, this.navigationService)
        ?? of<NavigationMenuLite>({ groups: [] });
      const navigation = await firstValueFrom(menu$);
      const navigationDuration = performance.now() - startTime;

      this.navigationTree.set([...(navigation.groups ?? [])]);

      this.observability.trackEvent('bootstrap.navigation.success', {
        groupCount: (navigation.groups ?? []).length,
        totalItems: this.countNavigationItems(navigation),
        duration: navigationDuration,
      });

      const totalDuration = performance.now() - startTime;
      this.isBootstrapComplete.set(true);
      this.isLoading.set(false);

      this.observability.trackEvent('bootstrap.complete', {
        duration: totalDuration,
        stage: 'success',
      });

      try {
        this.cdr.detectChanges();
      } catch {
        // noop
      }
    } catch (error: unknown) {
      const failureDuration = performance.now() - startTime;
      this.handleBootstrapError(error, failureDuration);
    }
  }

  private setupContextChangeListener(): void {
    let previousContext: AppContextLite | null = null;
    const context$ = this.resolveObservable(this.contextFacade.context$, this.contextService);

    if (!context$) {
      return;
    }

    context$
      .pipe(
        filter((ctx): ctx is AppContextLite => ctx !== null),
        debounceTime(100),
        tap((newContext) => {
          if (previousContext) {
            this.observability.trackEvent('context.changed', {
              oldTenantId: previousContext.tenantId,
              oldClientId: previousContext.clienteId,
              newTenantId: newContext.tenantId,
              newClientId: newContext.clienteId,
            });
          }

          this.activeContext.set({
            tenantId: newContext.tenantId,
            clienteId: newContext.clienteId ?? null,
            projetoId: newContext.projetoId ?? null,
            environment: newContext.environment ?? 'dev',
          });

          previousContext = newContext;
          this.navigationFacade?.rebuild?.();
        }),
        switchMap(() =>
          this.resolveObservable(this.navigationFacade?.menu$, this.navigationService)
          ?? of<NavigationMenuLite>({ groups: [] })
        ),
        tap((navigation) => {
          this.navigationTree.set([...(navigation.groups ?? [])]);
          if (previousContext) {
            this.observability.trackEvent('navigation.rebuilt', {
              groupCount: (navigation.groups ?? []).length,
              totalItems: this.countNavigationItems(navigation),
            });
          }
        }),
        catchError((error: unknown) => {
          this.observability.captureException(error, {
            code: 'context.navigation.rebuild.error',
          });
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private setupNavigationStreams(): void {
    const breadcrumbs$ = this.resolveObservable(this.navigationFacade?.breadcrumbs$, this.navigationService)
      ?? of<BreadcrumbLite[]>([]);
    breadcrumbs$
      .pipe(
        tap((crumbs) => {
          this.breadcrumbs.set(crumbs);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();

    const activeItem$ = this.resolveObservable(this.navigationFacade?.activeItem$, this.navigationService)
      ?? of<NavItemLite | null>(null);
    activeItem$
      .pipe(
        tap((item) => {
          this.activeItem.set(item);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  private handleBootstrapError(error: unknown, duration?: number): void {
    this.isLoading.set(false);
    this.hasError.set(true);

    const errorInfo = this.getErrorLike(error);
    const message = errorInfo.message ?? 'Erro inesperado ao carregar o Hub. Tente novamente.';

    let reasonCode = 'BOOTSTRAP_ERROR';
    if (message.includes('session')) {
      reasonCode = 'SESSION_RESTORE_FAILED';
    } else if (message.includes('context')) {
      reasonCode = 'CONTEXT_RESTORE_FAILED';
    } else if (message.includes('navigation')) {
      reasonCode = 'NAVIGATION_BUILD_FAILED';
    }

    this.errorDetails.set({
      code: reasonCode,
      message,
      status: errorInfo.status,
    });
    this.isBootstrapComplete.set(false);

    this.observability.captureException(error, {
      code: 'bootstrap.failed',
      extra: {
        reason: reasonCode,
        duration: duration ?? 0,
        stage: 'bootstrap',
      },
    });

    try {
      this.cdr.detectChanges();
    } catch {
      // noop
    }
  }

  onLogout(): void {
    this.observability.trackEvent('logout_clicked');

    this.currentUser.set(null);
    this.activeContext.set(null);
    this.navigationTree.set([]);
    this.isBootstrapComplete.set(false);

    try {
      this.sessionFacade.logout?.();
    } catch {
      // ignore
    }

    console.log('Logout executed');
  }

  async onContextSwitch(newContext: AppContextLite): Promise<void> {
    this.observability.trackEvent('context_switch_clicked', { newTenantId: newContext.tenantId });

    try {
      await this.contextFacade.setContext?.(newContext, { source: 'shell', persist: false });
      console.log('Context switch triggered:', newContext);
    } catch (error: unknown) {
      console.warn('Context switch failed', error);
    }
  }
}


