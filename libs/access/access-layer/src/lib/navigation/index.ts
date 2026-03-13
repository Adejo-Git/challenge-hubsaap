/**
 * Navigation Module - Access Layer
 * 
 * Exports públicos do módulo de navegação
 */

// Service principal
export * from './navigation.service';

// Models
export * from './navigation.model';

// Utilities (para uso avançado ou troubleshooting)
export {
  normalizeUrl,
  extractToolKeyFromUrl,
  isToolRoute,
  matchesNavItem,
  generateNavItemId,
  generateNavGroupId,
} from './navigation.util';

// Builder (para uso customizado se necessário)
export {
  buildNavigationTree,
  type IToolRegistryForNav,
  type ToolManifestLite,
  type NavigationBuildOptions,
} from './navigation.builder';

// Filter (para uso customizado se necessário)
export {
  filterNavigationTree,
  type IAccessDecisionServiceForNav,
  type IToolRegistryForFilter,
  type NavigationFilterOptions,
} from './navigation.filter';

// Breadcrumbs resolver
export {
  resolveBreadcrumbs,
  resolveBreadcrumbsSafe,
  type IToolRegistryForBreadcrumbs,
} from './navigation.breadcrumbs';

// Active resolver
export {
  resolveActiveItem,
  resolveActiveItemSafe,
  findNavItemById,
  findNavItemByRouteKey,
} from './navigation.active';
