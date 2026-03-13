import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import {
  setThemeApplyObservabilityAdapter,
  setThemeStorageAdapter,
  UiThemeApplyObservabilityEvent,
  UiThemeService,
} from '@hub/shared/ui-theme';
import { appRoutes } from './app.routes';

// Real services and factories
import { ContextService, InMemoryContextStorage } from '@hub/access-layer';
import { SessionService } from '@hub/access-layer';
import { createObservabilityService, ObservabilityService } from '@hub/observability/data-access';
import { NavigationService, ISessionServiceForNav, IContextServiceForNav } from '@hub/access-layer';
import { NotificationService } from '@hub/notifications/data-access';
import { AuthSessionService, AuthSessionStorage, StorageService as AuthStorageService } from '@hub/auth-session';
import { ToolRegistryService, ToolRegistryConfig } from '@hub/tool-registry';
import { TOOL_DESCRIPTORS } from './config/tool-descriptors';

import {
  NOTIFICATION_CENTER_CONTEXT_SOURCE,
  NOTIFICATION_CENTER_DATA_SOURCE,
  NOTIFICATION_CENTER_FEEDBACK_SOURCE,
  NOTIFICATION_CENTER_NAVIGATION_SOURCE,
  NOTIFICATION_CENTER_OBSERVABILITY_SOURCE,
} from './shell/notifications/notification-center/notification-center.facades';

// Lightweight in-memory StorageService implementation for AuthSession (suitable for tests/dev)
class InMemoryAuthStorage implements AuthStorageService {
  private store: Record<string, unknown> = {};
  async get<T>(key: string): Promise<T | null> {
    const v = this.store[key];
    return v === undefined ? null : (v as T);
  }
  async set<T>(key: string, value: T): Promise<void> {
    this.store[key] = value as unknown;
  }
  async remove(key: string): Promise<void> {
    delete this.store[key];
  }
}

function readScopedStorage(scopeKey: string): string | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  try {
    return globalThis.localStorage.getItem(scopeKey);
  } catch {
    return null;
  }
}

function writeScopedStorage(scopeKey: string, value: string): void {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return;
  }

  try {
    globalThis.localStorage.setItem(scopeKey, value);
  } catch {
    // noop: storage indisponível/bloqueado
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),

    // Observability: create a singleton instance via factory
    {
      provide: ObservabilityService,
      useFactory: () => createObservabilityService(),
    },

    // AuthSession / SessionService wiring (in-memory storage for dev/tests)
    {
      provide: AuthSessionStorage,
      useFactory: () => new AuthSessionStorage(new InMemoryAuthStorage(), { namespace: 'dev' }),
    },
    {
      provide: AuthSessionService,
      useFactory: (storage: AuthSessionStorage, obs: ObservabilityService) => {
        // RuntimeConfig shape expected by AuthSessionService
        type AuthRuntimeConfig = { refreshEnabled?: boolean };
        const cfg: AuthRuntimeConfig = { refreshEnabled: false };

        // Observability adapter shape expected by AuthSessionService
        type AuthObservability = { track: (name: string, meta?: Record<string, unknown>) => void };
        const adapter: AuthObservability = {
          track: (name: string, meta?: Record<string, unknown>) => obs.trackEvent(name, meta),
        };

        // Construct using precisely-typed local shapes to avoid `any` casts.
        return new AuthSessionService(storage, cfg as unknown as AuthRuntimeConfig, undefined, adapter as unknown as AuthObservability);
      },
      deps: [AuthSessionStorage, ObservabilityService],
    },

    // Provide Access-Layer SessionService (facade) backed by AuthSessionService
    {
      provide: SessionService,
      useFactory: (auth: AuthSessionService, obs: ObservabilityService) => {
        // The SessionService in access-layer expects AuthSessionService and ObservabilityService
        return new SessionService(auth, obs);
      },
      deps: [AuthSessionService, ObservabilityService],
    },

    // ContextService (real) with in-memory context storage
    {
      provide: ContextService,
      useFactory: () => new ContextService(null, {}, new InMemoryContextStorage()),
    },

    // NotificationService (real) wired to observability
    {
      provide: NotificationService,
      useFactory: (obs: ObservabilityService) => {
        const adapter: { trackEvent: (n: string, p?: Record<string, unknown>) => void } = {
          trackEvent: (n: string, p?: Record<string, unknown>) => obs.trackEvent(n, p),
        };
        return new NotificationService(undefined, undefined, undefined, adapter);
      },
      deps: [ObservabilityService],
    },

    // ToolRegistryService configuration with tool descriptors
    {
      provide: ToolRegistryService,
      useFactory: (obs: ObservabilityService) => {
        const config: ToolRegistryConfig = {
          descriptors: TOOL_DESCRIPTORS,
          runtimeConfig: undefined,
          devMode: true, // TODO: usar isDevMode() ou !environment.production
        };

        const toolRegistry = new ToolRegistryService(
          config,
          undefined, // Feature flags service (opcional)
          {
            track: (name: string, meta?: Record<string, unknown>) => obs.trackEvent(name, meta),
          }
        );

        return toolRegistry;
      },
      deps: [ObservabilityService],
    },

    // NavigationService configuration using real session/context/observability
    {
      provide: NavigationService,
      useFactory: (router: Router, session: SessionService, context: ContextService, obs: ObservabilityService) => {
        const navService = new NavigationService(router);
        // Provide narrow adapters matching NavigationService runtime interface to avoid
        // casting entire services to unknown. Keep adapters minimal and local.
        // Narrow shapes to avoid non-null assertions when calling optional functions
        const sessionAccessor = session as unknown as { session$?: (() => unknown) };
        const session$ = typeof sessionAccessor.session$ === 'function' ? sessionAccessor.session$() : undefined;
        const sessionAdapter: ISessionServiceForNav = {
          isAuthenticated: () => (typeof session.isAuthenticated === 'function' ? session.isAuthenticated() : false),
          session$: session$ as undefined | (() => unknown),
        } as ISessionServiceForNav;

        const contextAccessor = context as unknown as { snapshot?: () => unknown; context$?: () => unknown; changed$?: unknown; contextChange$?: unknown };
        const contextChange$ = typeof contextAccessor.context$ === 'function' ? contextAccessor.context$() : contextAccessor.changed$ ?? contextAccessor.contextChange$;
        const contextAdapter: IContextServiceForNav = {
          getActiveContext: () => (typeof contextAccessor.snapshot === 'function' ? contextAccessor.snapshot() : undefined),
          contextChange$: contextChange$,
        } as IContextServiceForNav;

        navService.configure({
          toolRegistry: undefined,
          accessDecision: undefined,
          sessionService: sessionAdapter,
          contextService: contextAdapter,
          observability: obs,
        });
        return navService;
      },
      deps: [Router, SessionService, ContextService, ObservabilityService],
    },

    // Map Notification center tokens to real instances/adapters
    {
      provide: NOTIFICATION_CENTER_DATA_SOURCE,
      useFactory: (svc: NotificationService) => svc,
      deps: [NotificationService],
    },
    {
      provide: NOTIFICATION_CENTER_CONTEXT_SOURCE,
      useFactory: (ctx: ContextService) => ({ contextChange$: (ctx as unknown as { changed$?: unknown }).changed$ }),
      deps: [ContextService],
    },
    {
      provide: NOTIFICATION_CENTER_NAVIGATION_SOURCE,
      useFactory: (router: Router) => ({ navigateTo: (p: string) => router.navigateByUrl(p) }),
      deps: [Router],
    },
    {
      provide: NOTIFICATION_CENTER_OBSERVABILITY_SOURCE,
      useFactory: (obs: ObservabilityService) => ({
        trackEvent: (n: string, p?: Record<string, unknown>) => obs.trackEvent(n, p),
        trackError: (n: string, e: unknown, p?: Record<string, unknown>) => obs.captureException(e, { code: n, extra: p }),
      }),
      deps: [ObservabilityService],
    },
    {
      provide: NOTIFICATION_CENTER_FEEDBACK_SOURCE,
      useFactory: () => ({ showError: (m: string) => console.warn('[UiFeedback] ' + m) }),
    },

    provideAppInitializer(() => {
      const uiThemeService = inject(UiThemeService);
      const observabilityService = inject(ObservabilityService);
      const toolRegistry = inject(ToolRegistryService);
      inject(SessionService);
      inject(ContextService);

      // Carregar catálogo de tools
      toolRegistry.load();

      // DEV ONLY: expõe serviços no window para smoke tests manuais
      if (typeof window !== 'undefined') {
        (window as unknown as { __router?: Router }).__router = inject(Router);
        (window as unknown as { __toolRegistry?: ToolRegistryService }).__toolRegistry = toolRegistry;
      }

      const getScope = (): string => {
        const root = typeof document !== 'undefined' ? document.documentElement : null;
        const tenantId = root?.getAttribute('data-tenant-id') ?? 'global';
        const authSession = inject(SessionService);
        const userId = (authSession as unknown as { snapshot?: () => { user?: { id?: string } } }).snapshot?.().user?.id ?? 'anonymous';

        return `${tenantId}:${userId}`;
      };

      setThemeStorageAdapter({
        getItem: (key: string): string | null => {
          const scopedKey = `${key}:${getScope()}`;
          return readScopedStorage(scopedKey) ?? readScopedStorage(key);
        },
        setItem: (key: string, value: string): void => {
          const scopedKey = `${key}:${getScope()}`;
          writeScopedStorage(scopedKey, value);
        },
      });

      setThemeApplyObservabilityAdapter({
        trackError: ({ source, operation, error }: UiThemeApplyObservabilityEvent): void => {
          observabilityService.captureException(error, {
            code: 'ui-theme-apply-error',
            extra: { source, operation },
          });
        },
      });

      uiThemeService.init();
    }),
  ],
};

export function getDefaultDevContext() {
  // Minimal dev context shape used by Shell and ContextService snapshot consumers
  return {
    tenantId: 'dev-tenant',
    clienteId: null,
    projetoId: null,
    environment: 'dev',
  } as const;
}
