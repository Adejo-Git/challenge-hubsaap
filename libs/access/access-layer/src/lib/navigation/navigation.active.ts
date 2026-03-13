/**
 * Navigation Active Item Resolver
 * 
 * Resolve item ativo no menu a partir de URL.
 * Responsabilidades:
 * - Encontrar NavItem correspondente à URL atual
 * - Suportar matching por URL, routeKey e toolKey
 * - Lidar com subpaths de tools (/tools/<toolKey>/subpath)
 * - Retornar null quando não encontrar (sem quebrar UI)
 */

import { NavItem, NavTree } from './navigation.model';
import { normalizeUrl, matchesNavItem, extractToolKeyFromUrl } from './navigation.util';

/**
 * Resolve item ativo a partir de URL
 */
export function resolveActiveItem(
  url: string,
  navTree: NavTree
): NavItem | null {
  const normalizedUrl = normalizeUrl(url);
  
  // Caso 1: Buscar match exato por URL
  const exactMatch = findNavItemByUrl(normalizedUrl, navTree);
  if (exactMatch) {
    return exactMatch;
  }
  
  // Caso 2: Se for rota de tool, buscar por toolKey
  const toolKey = extractToolKeyFromUrl(normalizedUrl);
  if (toolKey) {
    const toolMatch = findNavItemByToolKey(toolKey, navTree);
    if (toolMatch) {
      return toolMatch;
    }
  }
  
  // Caso 3: Buscar match por prefixo (para subpaths)
  const prefixMatch = findNavItemByPrefix(normalizedUrl, navTree);
  if (prefixMatch) {
    return prefixMatch;
  }
  
  // Caso 4: Não encontrou
  return null;
}

/**
 * Busca NavItem por URL exata
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
 * Busca NavItem por toolKey
 */
function findNavItemByToolKey(toolKey: string, navTree: NavTree): NavItem | null {
  for (const group of navTree.groups) {
    for (const item of group.items) {
      if (item.toolKey === toolKey) {
        return item;
      }
    }
  }
  
  return null;
}

/**
 * Busca NavItem por prefixo de URL (para subpaths)
 * Retorna o item mais específico (URL mais longa que corresponde)
 */
function findNavItemByPrefix(url: string, navTree: NavTree): NavItem | null {
  const normalizedUrl = normalizeUrl(url);
  
  let bestMatch: NavItem | null = null;
  let bestMatchLength = 0;
  
  for (const group of navTree.groups) {
    for (const item of group.items) {
      if (matchesNavItem(normalizedUrl, item)) {
        const itemUrlLength = item.url ? normalizeUrl(item.url).length : 0;
        
        // Preferir o match mais específico (URL mais longa)
        if (itemUrlLength > bestMatchLength) {
          bestMatch = item;
          bestMatchLength = itemUrlLength;
        }
      }
    }
  }
  
  return bestMatch;
}

/**
 * Busca NavItem por routeKey
 */
export function findNavItemByRouteKey(
  routeKey: string,
  navTree: NavTree
): NavItem | null {
  for (const group of navTree.groups) {
    for (const item of group.items) {
      if (item.routeKey === routeKey) {
        return item;
      }
    }
  }
  
  return null;
}

/**
 * Busca NavItem por ID
 */
export function findNavItemById(
  id: string,
  navTree: NavTree
): NavItem | null {
  for (const group of navTree.groups) {
    for (const item of group.items) {
      if (item.id === id) {
        return item;
      }
    }
  }
  
  return null;
}

/**
 * Resolve item ativo com fallback seguro
 * (nunca lança erro, retorna null em caso de problema)
 */
export function resolveActiveItemSafe(
  url: string,
  navTree: NavTree
): NavItem | null {
  try {
    return resolveActiveItem(url, navTree);
  } catch (_error) {
    // Fallback: retornar null (sem quebrar UI)
    void _error
    return null;
  }
}

/**
 * Verifica se um item está ativo para a URL atual
 */
export function isActiveItem(
  item: NavItem,
  url: string
): boolean {
  return matchesNavItem(url, item);
}

/**
 * Lista todos os itens ativos (pode haver mais de um em caso de hierarquia)
 * Ex: /tools/financeiro/invoices pode ativar tanto o item da tool quanto subitem
 */
export function findAllActiveItems(
  url: string,
  navTree: NavTree
): NavItem[] {
  const normalizedUrl = normalizeUrl(url);
  const activeItems: NavItem[] = [];
  
  for (const group of navTree.groups) {
    for (const item of group.items) {
      if (matchesNavItem(normalizedUrl, item)) {
        activeItems.push(item);
      }
    }
  }
  
  // Ordenar por especificidade (URL mais longa primeiro)
  return activeItems.sort((a, b) => {
    const lengthA = a.url ? normalizeUrl(a.url).length : 0;
    const lengthB = b.url ? normalizeUrl(b.url).length : 0;
    return lengthB - lengthA;
  });
}

/**
 * Resolve o grupo que contém o item ativo
 */
export function resolveActiveGroup(
  url: string,
  navTree: NavTree
): { group: import('./navigation.model').NavGroup; item: NavItem } | null {
  const normalizedUrl = normalizeUrl(url);
  
  for (const group of navTree.groups) {
    for (const item of group.items) {
      if (matchesNavItem(normalizedUrl, item)) {
        return { group, item };
      }
    }
  }
  
  return null;
}
