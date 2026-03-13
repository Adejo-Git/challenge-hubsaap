/**
 * Navigation Breadcrumbs Resolver
 * 
 * Resolve breadcrumbs a partir de URL/routeKey/tool metadata.
 * Responsabilidades:
 * - Construir breadcrumbs para rotas do Shell e /tools/*
 * - Suportar deep links e subpaths
 * - Retornar breadcrumbs mínimos quando não conseguir resolver
 * - NÃO alterar definição de rotas (RouterToolRoutes é dono)
 */

import { Breadcrumb, NavTree, NavItem } from './navigation.model';
import { normalizeUrl, extractToolKeyFromUrl } from './navigation.util';
import { ToolManifestLite } from './navigation.builder';

/**
 * Interface mínima do ToolRegistry para breadcrumbs
 */
export interface IToolRegistryForBreadcrumbs {
  getTool(toolKey: string): ToolManifestLite | null;
}

/**
 * Resolve breadcrumbs para uma URL
 */
export function resolveBreadcrumbs(
  url: string,
  navTree: NavTree,
  toolRegistry: IToolRegistryForBreadcrumbs
): Breadcrumb[] {
  const normalizedUrl = normalizeUrl(url);
  
  // Caso 1: Root (/)
  if (normalizedUrl === '/') {
    return [createHomeBreadcrumb()];
  }
  
  // Caso 2: Rota de tool (/tools/<toolKey> ou /tools/<toolKey>/...)
  const toolKey = extractToolKeyFromUrl(normalizedUrl);
  if (toolKey) {
    return resolveToolBreadcrumbs(normalizedUrl, toolKey, toolRegistry);
  }
  
  // Caso 3: Rota do Shell (buscar no navTree)
  const shellBreadcrumbs = resolveShellBreadcrumbs(normalizedUrl, navTree);
  if (shellBreadcrumbs.length > 0) {
    return shellBreadcrumbs;
  }
  
  // Caso 4: Não conseguiu resolver → breadcrumbs mínimos
  return [
    createHomeBreadcrumb(),
    {
      label: 'Página',
      isActive: true,
    },
  ];
}

/**
 * Cria breadcrumb de Home
 */
function createHomeBreadcrumb(): Breadcrumb {
  return {
    label: 'Início',
    url: '/',
    icon: 'home',
  };
}

/**
 * Resolve breadcrumbs para rotas de tool (/tools/<toolKey>/...)
 */
function resolveToolBreadcrumbs(
  url: string,
  toolKey: string,
  toolRegistry: IToolRegistryForBreadcrumbs
): Breadcrumb[] {
  const breadcrumbs: Breadcrumb[] = [createHomeBreadcrumb()];
  
  // Buscar metadados da tool
  const tool = toolRegistry.getTool(toolKey);
  
  if (!tool) {
    // Tool desconhecida → breadcrumbs mínimos
    breadcrumbs.push({
      label: 'Tool desconhecida',
      isActive: true,
    });
    return breadcrumbs;
  }
  
  // Adicionar breadcrumb da tool
  const toolBreadcrumb: Breadcrumb = {
    label: tool.title,
    url: tool.baseRoute,
    icon: tool.icon,
    toolKey: tool.toolKey,
  };
  
  // Se a URL é exatamente a baseRoute da tool, marcar como ativo
  const normalizedUrl = normalizeUrl(url);
  const normalizedBaseRoute = normalizeUrl(tool.baseRoute);
  
  if (normalizedUrl === normalizedBaseRoute) {
    toolBreadcrumb.isActive = true;
    breadcrumbs.push(toolBreadcrumb);
    return breadcrumbs;
  }
  
  // Se há subpath, adicionar tool como intermediário e criar breadcrumb da página
  breadcrumbs.push(toolBreadcrumb);
  
  // Extrair subpath
  const subpath = normalizedUrl.replace(normalizedBaseRoute, '').replace(/^\//, '');
  if (subpath) {
    // Criar breadcrumb da página (label a partir do último segmento)
    const segments = subpath.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    const pageLabel = formatSegmentAsLabel(lastSegment);
    
    breadcrumbs.push({
      label: pageLabel,
      url: normalizedUrl,
      isActive: true,
    });
  }
  
  return breadcrumbs;
}

/**
 * Resolve breadcrumbs para rotas do Shell (não-tools)
 */
function resolveShellBreadcrumbs(
  url: string,
  navTree: NavTree
): Breadcrumb[] {
  const normalizedUrl = normalizeUrl(url);
  
  // Buscar item correspondente no navTree
  const item = findNavItemByUrl(normalizedUrl, navTree);
  
  if (!item) {
    return [];
  }
  
  // Construir breadcrumbs a partir do item
  const breadcrumbs: Breadcrumb[] = [createHomeBreadcrumb()];
  
  // Se o item não é root, adicionar breadcrumb
  if (item.url !== '/') {
    breadcrumbs.push({
      label: item.label,
      url: item.url,
      icon: item.icon,
      isActive: true,
    });
  }
  
  return breadcrumbs;
}

/**
 * Busca NavItem por URL no navTree
 */
function findNavItemByUrl(url: string, navTree: NavTree): NavItem | null {
  const normalizedUrl = normalizeUrl(url);
  
  for (const group of navTree.groups) {
    for (const item of group.items) {
      if (item.url && normalizeUrl(item.url) === normalizedUrl) {
        return item;
      }
    }
  }
  
  return null;
}

/**
 * Formata segmento de URL como label legível
 * Ex: "invoice-details" → "Invoice Details"
 */
function formatSegmentAsLabel(segment: string): string {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Resolve breadcrumbs com fallback seguro
 * Sempre retorna pelo menos [Home]
 */
export function resolveBreadcrumbsSafe(
  url: string,
  navTree: NavTree,
  toolRegistry: IToolRegistryForBreadcrumbs
): Breadcrumb[] {
  try {
    const breadcrumbs = resolveBreadcrumbs(url, navTree, toolRegistry);
    
    // Garantir que sempre há pelo menos Home
    if (breadcrumbs.length === 0) {
      return [createHomeBreadcrumb()];
    }
    
    return breadcrumbs;
  } catch (error) {
    // Fallback: retornar breadcrumbs mínimos
    void error
    return [createHomeBreadcrumb()];
  }
}

/**
 * Resolve apenas o breadcrumb ativo (último da lista)
 */
export function resolveActiveBreadcrumb(
  url: string,
  navTree: NavTree,
  toolRegistry: IToolRegistryForBreadcrumbs
): Breadcrumb | null {
  const breadcrumbs = resolveBreadcrumbs(url, navTree, toolRegistry);
  
  // Retornar o último breadcrumb (ativo)
  const activeBreadcrumb = breadcrumbs.find((b) => b.isActive);
  
  return activeBreadcrumb ?? breadcrumbs[breadcrumbs.length - 1] ?? null;
}

/**
 * Cria breadcrumbs personalizados para páginas que não estão no navTree
 * (ex: páginas dinâmicas, detalhes de entidades)
 */
export function createCustomBreadcrumbs(
  baseBreadcrumbs: Breadcrumb[],
  customPages: Array<{ label: string; url?: string }>
): Breadcrumb[] {
  const breadcrumbs = [...baseBreadcrumbs];
  
  // Remover isActive dos breadcrumbs existentes
  breadcrumbs.forEach((b) => {
    b.isActive = false;
  });
  
  // Adicionar páginas customizadas
  customPages.forEach((page, index) => {
    breadcrumbs.push({
      label: page.label,
      url: page.url,
      isActive: index === customPages.length - 1,
    });
  });
  
  return breadcrumbs;
}
