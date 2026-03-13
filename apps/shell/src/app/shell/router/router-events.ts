import { Router, NavigationStart, NavigationEnd, NavigationError } from '@angular/router';
import { filter } from 'rxjs';
import { ObservabilityService } from '@hub/observability/data-access';

/**
 * Router Events Bridge
 *
 * Publica eventos do Router para:
 * 1. ObservabilityService - Telemetria de navegação
 * 2. NavigationService - Atualização de breadcrumbs
 * 3. Outros serviços que precisem reagir a mudanças de rota
 *
 * Eventos publicados:
 * - 'navigation_started' (NavigationStart)
 * - 'navigation_completed' (NavigationEnd)
 * - 'navigation_error' (NavigationError)
 */

export interface NavigationEvent {
  type: 'started' | 'completed' | 'error';
  timestamp: number;
  url: string;
  previousUrl?: string;
  routeName?: string;
  error?: unknown;
}

/**
 * Inicializa listeners de eventos do Router
 * Deve ser chamado durante bootstrap do Shell (ngOnInit do AppShellComponent)
 *
 * @param router Instância do Angular Router
 * @param observabilityService Instância do ObservabilityService (obrigatório)
 */
export function setupRouterEvents(router: Router, observabilityService: ObservabilityService): void {
  // Track navigation events via ObservabilityService
  router.events
    .pipe(
      filter((event) => event instanceof NavigationStart || event instanceof NavigationEnd || event instanceof NavigationError)
    )
    .subscribe((event) => {
      if (event instanceof NavigationStart) {
        observabilityService.trackEvent('navigation_started', { url: event.url });
      } else if (event instanceof NavigationEnd) {
        observabilityService.trackEvent('navigation_completed', {
          url: event.urlAfterRedirects,
          previousUrl: event.url,
        });
      } else if (event instanceof NavigationError) {
        observabilityService.captureException(event.error, {
          code: 'navigation_error',
          url: event.url,
          extra: { target: event.url },
        });
      }
    });
}

/**
 * Publish router event (helper para testes/debugging)
 * Não deve ser usado diretamente em produção
 */
export function publishRouterEvent(event: NavigationEvent): void {
  console.log('[RouterEvents] Custom event:', event);
}
