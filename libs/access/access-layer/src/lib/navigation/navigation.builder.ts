/**
 * Navigation Builder
 * 
 * Constrói a árvore base de navegação (Shell + Tools) a partir do ToolRegistry e configuração.
 * Responsabilidades:
 * - Compor itens fixos do Shell + itens de tools do ToolRegistry
 * - Ordenar e agrupar itens de forma estável e previsível
 * - NÃO aplica filtros de decisão/status (isso é o navigation.filter.ts)
 * - NÃO faz HTTP ou importa tools (apenas consome metadados do ToolRegistry)
 */

import { NavTree, NavGroup, NavItem, NavigationConfig } from './navigation.model';
import { 
  generateNavItemId, 
  generateNavGroupId, 
  sortNavItems, 
  deduplicateNavItems,
  mergeNavConfigs
} from './navigation.util';

/**
 * Interface mínima do ToolRegistry (evita acoplamento forte)
 * O NavigationBuilder só precisa de metadados lite das tools
 */
export interface ToolManifestLite {
  toolKey: string;
  title: string;
  baseRoute: string;
  icon?: string;
  group?: string;
  order?: number;
  menu?: {
    group?: string;
    order?: number;
    label?: string;
    icon?: string;
  };
}

/**
 * Interface mínima do ToolRegistry usado pelo builder
 */
export interface IToolRegistryForNav {
  listTools(): ToolManifestLite[];
}

/**
 * Opções de build da navegação
 */
export interface NavigationBuildOptions {
  /** Configuração de navegação (itens fixos, grupos, etc.) */
  config?: NavigationConfig;
  
  /** Se deve incluir itens de tools (default: true) */
  includeTools?: boolean;
  
  /** Se deve incluir links externos (default: true) */
  includeExternals?: boolean;
  
  /** Versão da árvore (para cache busting) */
  version?: number;
}

/**
 * Configuração default de navegação
 */
const DEFAULT_NAV_CONFIG: NavigationConfig = {
  fixedItems: [],
  defaultGroups: [
    { id: 'main', label: 'Principal', order: 0 },
    { id: 'tools', label: 'Ferramentas', order: 100 },
    { id: 'admin', label: 'Administração', order: 200 },
  ],
  groupOrder: {
    'main': 0,
    'tools': 100,
    'admin': 200,
  },
  externalLinks: [],
  separators: true,
};

/**
 * Constrói árvore de navegação base (Shell + Tools)
 */
export function buildNavigationTree(
  toolRegistry: IToolRegistryForNav,
  options: NavigationBuildOptions = {}
): NavTree {
  const config = options.config 
    ? mergeNavConfigs(DEFAULT_NAV_CONFIG, options.config)
    : DEFAULT_NAV_CONFIG;
  
  const includeTools = options.includeTools ?? true;
  const includeExternals = options.includeExternals ?? true;
  
  // 1. Coletar todos os itens (fixos + tools + externos)
  const allItems: NavItem[] = [];
  
  // 1a. Itens fixos do Shell
  if (config.fixedItems && Array.isArray(config.fixedItems) && config.fixedItems.length > 0) {
    allItems.push(...config.fixedItems);
  }
  
  // 1b. Itens de tools (do ToolRegistry)
  if (includeTools) {
    const toolItems = buildToolNavItems(toolRegistry);
    allItems.push(...toolItems);
  }
  
  // 1c. Links externos
  if (includeExternals && config.externalLinks && Array.isArray(config.externalLinks) && config.externalLinks.length > 0) {
    allItems.push(...config.externalLinks);
  }
  
  // 2. Deduplicate por ID (evitar colisão)
  const uniqueItems = deduplicateNavItems(allItems);
  
  // 3. Agrupar itens
  const groups = groupNavItems(uniqueItems, config);
  
  // 4. Ordenar grupos
  const sortedGroups = sortNavGroups(groups, config);
  
  // 5. Retornar árvore
  return {
    groups: sortedGroups,
    version: options.version ?? Date.now(),
    meta: {
      totalItems: uniqueItems.length,
      generatedAt: Date.now(),
    },
  };
}

/**
 * Constrói itens de navegação a partir das tools do ToolRegistry
 */
function buildToolNavItems(toolRegistry: IToolRegistryForNav): NavItem[] {
  const tools = toolRegistry.listTools();
  
  return tools.map((tool) => {
    // Usar metadados de menu se existirem, senão fallback para dados da tool
    const menuLabel = tool.menu?.label ?? tool.title;
    const menuIcon = tool.menu?.icon ?? tool.icon;
    const menuGroup = tool.menu?.group ?? tool.group ?? 'tools';
    const menuOrder = tool.menu?.order ?? tool.order;
    
    const item: NavItem = {
      id: generateNavItemId({ toolKey: tool.toolKey }),
      label: menuLabel,
      type: 'link',
      url: tool.baseRoute,
      routeKey: `tool.${tool.toolKey}`,
      toolKey: tool.toolKey,
      icon: menuIcon,
      order: menuOrder,
      meta: {
        group: menuGroup,
      },
    };
    
    return item;
  });
}

/**
 * Agrupa itens de navegação por campo meta.group
 */
function groupNavItems(items: NavItem[], config: NavigationConfig): NavGroup[] {
  // Mapear itens por grupo
  const groupMap = new Map<string, NavItem[]>();
  
  items.forEach((item) => {
    const groupId = (item.meta?.['group'] as string) ?? 'main';

    // avoid non-null assertion by using a local array and set
    const arr = groupMap.get(groupId) ?? [];
    arr.push(item);
    groupMap.set(groupId, arr);
  });
  
  // Criar grupos
  const groups: NavGroup[] = [];
  
  groupMap.forEach((groupItems, groupId) => {
    // Buscar label do grupo a partir de defaultGroups
    const groupConfig = config.defaultGroups?.find((g) => g.id === groupId);
    const groupLabel = groupConfig?.label ?? groupId;
    const groupOrder = groupConfig?.order ?? config.groupOrder?.[groupId] ?? 999;
    
    // Ordenar itens dentro do grupo
    const sortedItems = sortNavItems(groupItems);
    
    const group: NavGroup = {
      id: generateNavGroupId({ label: groupLabel, order: groupOrder }),
      label: groupLabel,
      items: sortedItems,
      order: groupOrder,
    };
    
    groups.push(group);
  });
  
  return groups;
}

/**
 * Ordena grupos de navegação por ordem
 */
function sortNavGroups(groups: NavGroup[], _config: NavigationConfig): NavGroup[] {
  void _config
  return sortNavItems(groups).map((group) => {
     // Remover grupos vazios
    if (group.items.length === 0) {
      return null;
    }
    return group;
  }).filter((g): g is NavGroup => g !== null);
}

/**
 * Adiciona separadores entre grupos (se configurado)
 */
export function addSeparators(groups: NavGroup[], config: NavigationConfig): NavGroup[] {
  if (!config.separators || groups.length <= 1) {
    return groups;
  }
  
  const result: NavGroup[] = [];
  
  groups.forEach((group, index) => {
    result.push(group);
    
    // Adicionar separador após cada grupo (exceto o último)
    if (index < groups.length - 1) {
      result.push({
        id: `separator-${index}`,
        items: [{
          id: `separator-item-${index}`,
          label: '',
          type: 'separator',
        }],
        order: group.order ? group.order + 0.5 : undefined,
      });
    }
  });
  
  return result;
}

/**
 * Valida se a árvore de navegação é válida
 * (todos os grupos têm itens, todos os itens têm IDs únicos)
 */
export function validateNavTree(tree: NavTree): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Verificar se há grupos
  if (!tree.groups || tree.groups.length === 0) {
    errors.push('NavTree deve ter pelo menos um grupo');
  }
  
  // Verificar IDs únicos
  const allIds = new Set<string>();
  const allItemIds = new Set<string>();
  
  tree.groups.forEach((group) => {
    // Verificar ID do grupo
    if (!group.id) {
      errors.push('Grupo sem ID');
    } else if (allIds.has(group.id)) {
      errors.push(`ID de grupo duplicado: ${group.id}`);
    } else {
      allIds.add(group.id);
    }
    
    // Verificar itens do grupo
    if (!group.items || group.items.length === 0) {
      errors.push(`Grupo ${group.id} está vazio`);
    }
    
    group.items.forEach((item) => {
      // Verificar ID do item
      if (!item.id) {
        errors.push('Item sem ID');
      } else if (allItemIds.has(item.id)) {
        errors.push(`ID de item duplicado: ${item.id}`);
      } else {
        allItemIds.add(item.id);
      }
      
      // Verificar campos obrigatórios
      if (!item.label) {
        errors.push(`Item ${item.id} sem label`);
      }
      
      if (!item.type) {
        errors.push(`Item ${item.id} sem type`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
