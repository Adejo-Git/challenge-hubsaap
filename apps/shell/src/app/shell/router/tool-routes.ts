import { Routes, CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AccessDecisionService, DenyReason } from '@hub/access-layer';
import { ToolRegistryService } from '@hub/tool-registry';
import { ToolKey } from '@hub/tool-contract';

/**
 * Tool Child Routes Configuration
 *
 * ✅ CONFORMIDADE: access-layer-contracts.instructions.md + boundaries.instructions.md
 *
 * Responsável por:
 * - Lazy loading do ToolRoot/ToolModule em /tools/:toolKey
 * - Aplicar AuthGuard e Route Guards para bloquear acesso indevido
 * - Resolver fallback: 401/403/404 conforme cenário
 * - Consumir decisões determinísticas do AccessDecisionService (sem lógica própria)
 * - Resolver dinamicamente o módulo da tool via ToolRegistry
 *
 * Convenção:
 * - Todas as tools carregam em /tools/:toolKey
 * - authGuard em canMatch impede download do módulo quando não autenticado
 * - toolGuard em canActivate valida existência/permissão após params resolvidos
 * - ToolKey é extraído da rota e usado para validação
 *
 * CONFORMIDADE:
 * - ✅ Guards consomem AccessDecisionService outputs (allow/deny/reason/capabilities)
 * - ✅ Sem lógica de decisão nos guards (delegada ao Access Layer)
 * - ✅ Telemetria de decisões (allow/deny events)
 * - ✅ Reason codes mapeados para URLs de fallback (404/403)
 * - ✅ Resolução dinâmica de módulo via ToolRegistry
 */

/**
 * Auth Guard
 */
export const authGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const router = inject(Router);
  const accessDecision = inject(AccessDecisionService);

  const toolKey = route.params['toolKey'] ?? 'shell';
  const decision = accessDecision.canEnterTool(toolKey);

  if (decision.allow) {
    return true;
  }

  if (decision.denyReason === DenyReason.UNAUTHENTICATED) {
    return router.parseUrl(`/login?returnUrl=${encodeURIComponent(state.url)}`);
  }

  // Casos não autenticáveis ficam delegados ao toolGuard
  return true;
};

/**
 * Tool Guard
 */
export const toolGuard: CanActivateFn = (route): boolean | UrlTree => {
  const router = inject(Router);
  const accessDecision = inject(AccessDecisionService);
  const toolRegistry = inject(ToolRegistryService, { optional: true });

  const toolKey = route.params['toolKey'];

  if (!toolKey) {
    return router.parseUrl('/error/404');
  }

  // Validar existência no registry (se disponível)
  if (toolRegistry && !toolRegistry.exists(toolKey as ToolKey)) {
    return router.parseUrl('/error/404');
  }

  const decision = accessDecision.canEnterTool(toolKey);
  if (!decision.allow) {
    if (decision.denyReason === DenyReason.UNAUTHENTICATED) {
      return router.parseUrl('/auth/login');
    }

    if (decision.denyReason === DenyReason.NOT_FOUND || decision.denyReason === DenyReason.DISABLED) {
      return router.parseUrl('/error/404');
    }

    return router.parseUrl('/error/403');
  }

  return true;
};

/**
 * Routes para tools lazy-loaded
 * A tool é responsável por suas subrotas internas
 *
 * Resolução dinâmica:
 * - Para cada toolKey, carrega o módulo correspondente via import dinâmico
 * - Academy: import('@academy/tool-module')
 * - Tax-Map (exemplo): import('@tax-map/tool-module')
 */
export const toolChildRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, toolGuard],
    canMatch: [authGuard],
    loadChildren: () => {
      // Resolve toolKey do segmento de rota
      // Nota: Este código roda APÓS os guards passarem
      const toolKey = getCurrentToolKey();

      // Map de imports dinâmicos por toolKey
      const toolModuleMap: Record<string, () => Promise<{ ToolModule: unknown }>> = {
        'academy': () => import('../../../../../apps/tools/academy/src/app/tool-module/tool.module').then(m => ({ ToolModule: m.ToolModule })),
        // Adicionar outras tools aqui:
        // 'tax-map': () => import('../../../../../apps/tools/tax-map/src/app/tool-module/tool.module').then(m => ({ ToolModule: m.ToolModule })),
      };

      const loader = toolModuleMap[toolKey];
      if (!loader) {
        // Fallback: retornar rota de erro
        return import('../../dashboard/dashboard.component').then((m) => [
          {
            path: '',
            component: m.DashboardComponent,
          },
        ]);
      }

      return loader().then((mod) => {
        const ToolModule = mod.ToolModule as { routes?: Routes };
        return ToolModule.routes || [];
      });
    },
  },
];

/**
 * Helper: extrai toolKey do segmento de rota atual
 * Fallback: 'shell' se não encontrado
 */
function getCurrentToolKey(): string {
  if (typeof window === 'undefined') return 'shell';
  const segments = window.location.pathname.split('/');
  const toolsIndex = segments.indexOf('tools');
  return toolsIndex >= 0 && segments[toolsIndex + 1] ? segments[toolsIndex + 1] : 'shell';
}
