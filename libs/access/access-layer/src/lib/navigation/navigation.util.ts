/**
 * Navigation Utilities
 * 
 * Helpers para normalização de URL, geração de IDs estáveis e matching.
 */

import { NavItem, NavMeta } from './navigation.model';

/**
 * Normaliza URL para matching previsível
 * - Remove query string e hash
 * - Remove trailing slash (exceto root '/')
 * - Lowercase
 * - Trim
 */
export function normalizeUrl(url: string): string {
  if (!url) return '/';
  
  // Remove query string e hash
  let normalized = url.split('?')[0].split('#')[0];
  
  // Trim
  normalized = normalized.trim();
  
  // Remove trailing slash (exceto root)
  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  
  // Lowercase para matching case-insensitive
  normalized = normalized.toLowerCase();
  
  return normalized || '/';
}

/**
 * Gera ID estável para item de navegação
 * - Baseado em toolKey/routeKey/url (nesta ordem de preferência)
 * - Formato: 'nav-{source}-{key}'
 */
export function generateNavItemId(item: Partial<NavItem>): string {
  if (item.toolKey) {
    return `nav-tool-${item.toolKey}`;
  }
  
  if (item.routeKey) {
    return `nav-route-${item.routeKey}`;
  }
  
  if (item.url) {
    const normalized = normalizeUrl(item.url);
    // Remove caracteres especiais e substitui por hífen
    const sanitized = normalized.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');
    return `nav-url-${sanitized}`;
  }
  
  // Fallback: gerar a partir do label
  if (item.label) {
    const sanitized = item.label.toLowerCase().replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');
    return `nav-label-${sanitized}`;
  }
  
  // Último recurso: timestamp (não ideal, mas evita colisão)
  return `nav-item-${Date.now()}`;
}

/**
 * Gera ID estável para grupo de navegação
 */
export function generateNavGroupId(group: { label?: string; order?: number }): string {
  if (group.label) {
    const sanitized = group.label.toLowerCase().replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');
    return `nav-group-${sanitized}`;
  }
  
  if (group.order !== undefined) {
    return `nav-group-${group.order}`;
  }
  
  return `nav-group-${Date.now()}`;
}

/**
 * Verifica se uma URL corresponde a um item de navegação
 * - Matching exato (após normalização)
 * - Matching por prefixo (para rotas com subpaths)
 */
export function matchesNavItem(url: string, item: NavItem): boolean {
  if (!item.url) return false;
  
  const normalizedUrl = normalizeUrl(url);
  const normalizedItemUrl = normalizeUrl(item.url);
  
  // Matching exato
  if (normalizedUrl === normalizedItemUrl) {
    return true;
  }
  
  // Matching por prefixo (para /tools/financeiro e /tools/financeiro/invoices)
  // IMPORTANTE: evitar falso-positivo entre /tools/a e /tools/ab
  // Garantir que o próximo caractere após o prefixo seja '/' ou fim da string
  if (normalizedUrl.startsWith(normalizedItemUrl)) {
    const nextChar = normalizedUrl[normalizedItemUrl.length];
    return !nextChar || nextChar === '/';
  }
  
  return false;
}

/**
 * Extrai toolKey de uma URL /tools/<toolKey>
 * Retorna null se não for rota de tool
 */
export function extractToolKeyFromUrl(url: string): string | null {
  const normalized = normalizeUrl(url);
  
  // Pattern: /tools/<toolKey> ou /tools/<toolKey>/...
  const match = normalized.match(/^\/tools\/([^/]+)/);

  return match ? match[1] : null;
}

/**
 * Valida se uma URL é uma rota de tool válida
 */
export function isToolRoute(url: string): boolean {
  return extractToolKeyFromUrl(url) !== null;
}

/**
 * Cria NavMeta a partir de item de navegação
 */
export function createNavMeta(item: NavItem, parent?: NavMeta): NavMeta {
  return {
    toolKey: item.toolKey,
    routeKey: item.routeKey,
    url: normalizeUrl(item.url || '/'),
    title: item.label,
    depth: parent ? parent.depth + 1 : 0,
    parent,
  };
}

/**
 * Mescla configurações de navegação (default + override)
 */
export function mergeNavConfigs<T>(
  base: T,
  override: Partial<T>
): T {
  return {
    ...base,
    ...override,
  };
}

/**
 * Ordena itens de navegação por campo order (crescente)
 * Itens sem order vão para o final (mantendo ordem relativa)
 */
export function sortNavItems<T extends { order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
}

/**
 * Remove itens duplicados baseado em ID
 */
export function deduplicateNavItems<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/**
 * Valida se um item de navegação tem campos obrigatórios
 */
export function isValidNavItem(item: Partial<NavItem>): item is NavItem {
  return !!(
    item.id &&
    item.label &&
    item.type
  );
}

/**
 * Calcula profundidade de uma URL (número de segmentos após normalização)
 */
export function getUrlDepth(url: string): number {
  const normalized = normalizeUrl(url);
  if (normalized === '/') return 0;
  
  // Remove leading slash e conta segmentos
  const segments = normalized.slice(1).split('/').filter(Boolean);
  return segments.length;
}
