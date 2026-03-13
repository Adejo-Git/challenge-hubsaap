/**
 * @file route-guards.util.ts
 * @description Utilitários puros para Route Guards do Shell.
 *
 * Responsabilidades:
 * - Extrair requirements de ActivatedRouteSnapshot/Route
 * - Mapear denyReason para UrlTree (401/403/404)
 * - Validação de presença de chaves obrigatórias em route.data
 * - Funções puras sem dependências de serviços
 *
 * GUARDRAILS:
 * - Sem HttpClient
 * - Sem chamadas a serviços (injetar eles no guard, não aqui)
 * - Sem side effects (funções puras)
 * - Sem lógica de RBAC/ABAC (delegada ao AccessDecisionService)
 */

import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';

/**
 * Razões de negação de acesso mapeadas para fallback HTTP status.
 *
 * Enumeração determinística para padronizar mapeamento guard deny → UrlTree.
 * Usado como entrada para denyReasonToUrlTree().
 */
export enum DenyReason {
  /** Ferramenta/rota não existe no registry. Status: 404 */
  UNKNOWN_TOOL = 'unknown-tool',

  /** Ferramenta desabilitada por flag/contexto. Status: 404 (conforme regra definida) */
  FLAG_DISABLED = 'flag-disabled',

  /** Sem permissão/policy para acessar. Status: 403 */
  FORBIDDEN = 'forbidden',

  /** Sem autenticação. Status: 401 (raro no guard, normalmente coberto pelo AuthGuard) */
  UNAUTHENTICATED = 'unauthenticated',

  /** Rota ausente de route.data (configuração incompleta). Status: 404 */
  MISSING_ROUTE_DATA = 'missing-route-data',

  /** Rota.data incompleto (toolKey/featureFlagKey/permissionKey ausente e obrigatório). Status: 403 */
  INCOMPLETE_ROUTE_CONFIG = 'incomplete-route-config',
}

/**
 * Contrato mínimo de requisitos extraídos de route.data.
 *
 * Define quais chaves o guard espera encontrar em route.data para validação.
 */
export interface RouteRequirements {
  /** Identificador único da tool (ex: 'pipelines', 'vp'). Obrigatório para /tools/* */
  toolKey?: string;

  /** Chave de feature flag para validar se tool está habilitada. Ex: 'global.tool-pipelines' */
  featureFlagKey?: string;

  /** Chave de permissão para validar acesso. Delegado ao AccessDecisionService */
  permissionKey?: string;

  /** Se true, requer contexto válido (tenant/cliente/projeto). Delegado ao AccessDecisionService */
  requireContext?: boolean;

  /** Se true, requer autenticação. Normalmente true; delegado ao AccessDecisionService */
  requireAuth?: boolean;
}

/**
 * Extrai requirements de ActivatedRouteSnapshot.data de forma segura.
 *
 * Procura pelas chaves: toolKey, featureFlagKey, permissionKey, requireContext, requireAuth.
 * Retorna objeto vazio se nenhuma chave for encontrada (não é erro).
 * Valida tipos (strings para keys, boolean para flags).
 *
 * @param route - ActivatedRouteSnapshot alvo
 * @returns RouteRequirements com chaves mapeadas (undefined se ausente)
 *
 * @example
 * // route.data = { toolKey: 'pipelines', featureFlagKey: 'global.pipelines' }
 * const reqs = extractRequirementsFromRoute(route);
 * // { toolKey: 'pipelines', featureFlagKey: 'global.pipelines' }
 */
// Accept both ActivatedRouteSnapshot and Route (used by CanMatch)
export function extractRequirementsFromRoute(route: ActivatedRouteSnapshot | import('@angular/router').Route): RouteRequirements {
  const data = (route as { data?: Record<string, unknown> }).data ?? {};
  if (!data) {
    return {};
  }

  const reqs: RouteRequirements = {};

  // Extrair strings (toolKey, featureFlagKey, permissionKey)
  if (typeof data['toolKey'] === 'string') {
    reqs.toolKey = data['toolKey'];
  }
  if (typeof data['featureFlagKey'] === 'string') {
    reqs.featureFlagKey = data['featureFlagKey'];
  }
  if (typeof data['permissionKey'] === 'string') {
    reqs.permissionKey = data['permissionKey'];
  }

  // Extrair booleans (requireContext, requireAuth)
  if (typeof data['requireContext'] === 'boolean') {
    reqs.requireContext = data['requireContext'];
  }
  if (typeof data['requireAuth'] === 'boolean') {
    reqs.requireAuth = data['requireAuth'];
  }

  return reqs;
}

/**
 * Mapeia DenyReason para UrlTree (fallback de redirecionamento).
 *
 * Regra de mapeamento (conforme Spec):
 * - UNKNOWN_TOOL, FLAG_DISABLED, MISSING_ROUTE_DATA → /error/404
 * - FORBIDDEN, INCOMPLETE_ROUTE_CONFIG → /error/403
 * - UNAUTHENTICATED → /error/401
 *
 * Nenhuma UrlTree aponta para a mesma rota (evita loop).
 *
 * @param reason - Motivo técnico de negação (DenyReason enum)
 * @param router - Injeção do Router para criar UrlTree
 * @returns UrlTree com URL de fallback apropriada
 *
 * @example
 * const urlTree = denyReasonToUrlTree(DenyReason.FORBIDDEN, router);
 * // → router.parseUrl('/error/403')
 */
export function denyReasonToUrlTree(reason: DenyReason, router: Router): UrlTree {
  switch (reason) {
    case DenyReason.UNKNOWN_TOOL:
    case DenyReason.FLAG_DISABLED:
    case DenyReason.MISSING_ROUTE_DATA:
      return router.parseUrl('/error/404');

    case DenyReason.FORBIDDEN:
    case DenyReason.INCOMPLETE_ROUTE_CONFIG:
      return router.parseUrl('/error/403');

    case DenyReason.UNAUTHENTICATED:
      return router.parseUrl('/error/401');

    default:
      // Fallback seguro: tratar como 403 (negar por padrão)
      return router.parseUrl('/error/403');
  }
}

/**
 * Valida se toolKey extraído de route.data é válido (presente e não vazio).
 *
 * Usado especialmente em `canMatch` antes de tentar carregar módulo lazy.
 *
 * @param toolKey - Chave da tool (pode ser undefined)
 * @returns { valid: boolean, reason?: DenyReason }
 *
 * @example
 * const validation = validateToolKey(route.params['toolKey']);
 * if (!validation.valid) {
 *   // toolKey ausente ou vazio → retornar 404
 * }
 */
export function validateToolKey(toolKey: string | undefined): {
  valid: boolean;
  reason?: DenyReason;
} {
  if (!toolKey || toolKey.trim() === '') {
    return {
      valid: false,
      reason: DenyReason.MISSING_ROUTE_DATA,
    };
  }

  return { valid: true };
}

/**
 * Normaliza nome de toolKey para uso em comparações (lowercase, trim).
 *
 * Evita inconsistências de case ou espaços em branco.
 *
 * @param toolKey - Chave potencialmente "suja"
 * @returns String normalizada ou vazio se null/undefined
 */
export function normalizeToolKey(toolKey: string | undefined): string {
  return (toolKey || '').toLowerCase().trim();
}

/**
 * Extrai toolKey de route params ou route.data.
 *
 * Prioridade:
 * 1. route.params['toolKey'] (de :toolKey na rota)
 * 2. route.data['toolKey'] (se declarado em route.data)
 * 3. undefined
 *
 * @param route - ActivatedRouteSnapshot alvo
 * @returns toolKey ou undefined
 */
export function extractToolKeyFromRoute(route: ActivatedRouteSnapshot | import('@angular/router').Route): string | undefined {
  // If it's a snapshot, prefer params
  if ((route as ActivatedRouteSnapshot).params && (route as ActivatedRouteSnapshot).params['toolKey']) {
    return (route as ActivatedRouteSnapshot).params['toolKey'];
  }

  // Otherwise, check data (works for Route and snapshot)
  const data = (route as { data?: Record<string, unknown> }).data ?? {};
  if (typeof data['toolKey'] === 'string') {
    return data['toolKey'];
  }

  return undefined;
}

/**
 * Montar payload seguro de telemetria para evento de decisão de guard.
 *
 * Remove dados sensíveis (claims, roles, token) e normaliza para logging/observability.
 *
 * @param allowed - Boolean de decisão final
 * @param routePath - Caminho da rota (normalizado, sem query params)
 * @param denyReason - Motivo de negação (se allowed=false)
 * @param toolKey - Chave da tool (opcional)
 * @returns Objeto seguro para telemetria
 *
 * @example
 * const event = buildGuardTelemetry(
 *   false,
 *   '/tools/pipelines/overview',
 *   DenyReason.FORBIDDEN,
 *   'pipelines'
 * );
 * // { allowed: false, route: '/tools/pipelines/overview', denyReason: 'forbidden', toolKey: 'pipelines' }
 */
export function buildGuardTelemetry(
  allowed: boolean,
  routePath: string,
  denyReason?: DenyReason,
  toolKey?: string
): Record<string, unknown> {
  const event: Record<string, unknown> = {
    allowed,
    route: getNormalizedRoutePath(routePath),
  };

  if (!allowed && denyReason) {
    (event as Record<string, unknown>)['denyReason'] = denyReason;
  }

  if (toolKey) {
    (event as Record<string, unknown>)['toolKey'] = toolKey;
  }

  return event;
}

/**
 * Normaliza caminho de rota removendo query params, fragments, etc.
 *
 * Exemplo: '/tools/pipelines/overview?page=1#anchor' → '/tools/pipelines/overview'
 *
 * @param path - Caminho potencialmente "sujo"
 * @returns Caminho normalizado
 */
export function getNormalizedRoutePath(path: string): string {
  return (path || '').split('?')[0].split('#')[0];
}

/**
 * Valida se uma rotaé pública e não deve ser protegida pelo guard.
 *
 * Rotas públicas: /error/*, /login, /auth/*, etc.
 * Evita proteger as próprias páginas de erro (evita loops).
 *
 * @param path - Caminho da rota
 * @returns true se a rota é pública (não deve ser protegida)
 */
export function isPublicRoute(path: string): boolean {
  const publicPrefixes = ['/error', '/auth', '/login', '/public'];
  const normalized = getNormalizedRoutePath(path).toLowerCase();

  return publicPrefixes.some((prefix) => normalized.startsWith(prefix));
}
