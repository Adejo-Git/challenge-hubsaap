/**
 * Navigation Filter
 * 
 * Aplica decisões de acesso e status (installed/enabled) na árvore de navegação.
 * Responsabilidades:
 * - Filtrar itens inacessíveis (canView/canEnter) usando AccessDecisionService
 * - Aplicar status de tool (installed/enabled/disabled)
 * - Remover grupos vazios após filtragem
 * - NÃO reavalia políticas na UI (consome saídas do AccessDecisionService)
 * - NÃO altera ordenação (mantém ordem do builder)
 */

import { NavTree, NavGroup, NavItem } from './navigation.model';

/**
 * DecisionTarget (re-declarado localmente para evitar dependência circular)
 */
export interface DecisionTarget {
  type: 'route' | 'tool' | 'feature' | 'action';
  key: string;
}

/**
 * AccessDecisionResult (re-declarado localmente)
 */
export interface AccessDecisionResult {
  allowed: boolean;
  denyReason?: string;
}

/**
 * Interface mínima do AccessDecisionService
 */
export interface IAccessDecisionServiceForNav {
  /**
   * Verifica se pode visualizar o alvo (canView)
   * - Para itens de menu, verifica se deve aparecer no menu
   * - Não garante que pode entrar (isso é canEnter)
   */
  canView(target: DecisionTarget): boolean;
  
  /**
   * Verifica se pode entrar no alvo (canEnter)
   * - Para rotas, verifica se pode navegar
   * - Usado para desabilitar/habilitar itens no menu
   */
  canEnter(target: DecisionTarget): boolean;
  
  /**
   * Avalia decisão completa (opcional, para obter denyReason)
   */
  evaluate?(target: DecisionTarget): AccessDecisionResult;
}

/**
 * Status de tool (do ToolRegistry)
 */
export interface ToolStatus {
  installed: boolean;
  enabled: boolean;
  disabledReason?: string;
}

/**
 * Interface mínima do ToolRegistry para filtro
 */
export interface IToolRegistryForFilter {
  status(toolKey: string): ToolStatus;
}

/**
 * Opções de filtro de navegação
 */
export interface NavigationFilterOptions {
  /** Se deve remover itens que canView=false (default: true) */
  removeHidden?: boolean;
  
  /** Se deve desabilitar itens que canEnter=false (default: true) */
  disableInaccessible?: boolean;
  
  /** Se deve remover grupos vazios após filtro (default: true) */
  removeEmptyGroups?: boolean;
  
  /** Se deve aplicar status de tool (default: true) */
  applyToolStatus?: boolean;
}

/**
 * Filtra árvore de navegação aplicando decisões de acesso e status
 */
export function filterNavigationTree(
  tree: NavTree,
  accessDecision: IAccessDecisionServiceForNav,
  toolRegistry: IToolRegistryForFilter,
  options: NavigationFilterOptions = {}
): NavTree {
  const opts = {
    removeHidden: options.removeHidden ?? true,
    disableInaccessible: options.disableInaccessible ?? true,
    removeEmptyGroups: options.removeEmptyGroups ?? true,
    applyToolStatus: options.applyToolStatus ?? true,
  };
  
  // 1. Filtrar grupos e seus itens
  const filteredGroups = tree.groups
    .map((group) => filterNavGroup(group, accessDecision, toolRegistry, opts))
    .filter((group): group is NavGroup => group !== null);
  
  // 2. Remover grupos vazios (se configurado)
  const finalGroups = opts.removeEmptyGroups
    ? filteredGroups.filter((group) => group.items.length > 0)
    : filteredGroups;
  
  return {
    ...tree,
    groups: finalGroups,
    meta: {
      ...tree.meta,
      totalItems: finalGroups.reduce((sum, g) => sum + g.items.length, 0),
    },
  };
}

/**
 * Filtra um grupo de navegação
 */
function filterNavGroup(
  group: NavGroup,
  accessDecision: IAccessDecisionServiceForNav,
  toolRegistry: IToolRegistryForFilter,
  options: Required<NavigationFilterOptions>
): NavGroup | null {
  // Filtrar itens do grupo
  const filteredItems = group.items
    .map((item) => filterNavItem(item, accessDecision, toolRegistry, options))
    .filter((item): item is NavItem => item !== null);
  
  // Se grupo ficou vazio e devemos remover grupos vazios, retornar null
  if (filteredItems.length === 0 && options.removeEmptyGroups) {
    return null;
  }
  
  return {
    ...group,
    items: filteredItems,
  };
}

/**
 * Filtra um item de navegação
 */
function filterNavItem(
  item: NavItem,
  accessDecision: IAccessDecisionServiceForNav,
  toolRegistry: IToolRegistryForFilter,
  options: Required<NavigationFilterOptions>
): NavItem | null {
  // 1. Aplicar status de tool (se for item de tool)
  if (item.toolKey && options.applyToolStatus) {
    const status = toolRegistry.status(item.toolKey);
    
    // Se não instalado, remover do menu
    if (!status.installed) {
      return null;
    }
    
    // Se disabled, marcar item como disabled
    if (!status.enabled) {
      return {
        ...item,
        disabled: true,
        disabledReason: status.disabledReason ?? 'Tool desabilitada',
      };
    }
  }
  
  // 2. Verificar canView (visibilidade no menu)
  const target = buildDecisionTarget(item);
  const canViewItem = accessDecision.canView(target);
  
  // Se não pode ver e deve remover, retornar null
  if (!canViewItem && options.removeHidden) {
    return null;
  }
  
  // 3. Verificar canEnter (permissão de navegação)
  const canEnterItem = accessDecision.canEnter(target);
  
  // Se não pode entrar e deve desabilitar, marcar como disabled
  if (!canEnterItem && options.disableInaccessible) {
    // Tentar obter denyReason se disponível
    let denyReason = 'Acesso negado';
    if (accessDecision.evaluate) {
      const decision = accessDecision.evaluate(target);
      if (decision.denyReason) {
        denyReason = mapDenyReasonToMessage(decision.denyReason);
      }
    }
    
    return {
      ...item,
      disabled: true,
      disabledReason: denyReason,
    };
  }
  
  // Item passou por todos os filtros
  return item;
}

/**
 * Constrói DecisionTarget a partir de NavItem
 */
function buildDecisionTarget(item: NavItem): DecisionTarget {
  // Preferência: tool > route > url
  if (item.toolKey) {
    return {
      type: 'tool',
      key: item.toolKey,
    };
  }
  
  if (item.routeKey) {
    return {
      type: 'route',
      key: item.routeKey,
    };
  }
  
  if (item.url) {
    return {
      type: 'route',
      key: item.url,
    };
  }
  
  // Fallback: feature genérica
  return {
    type: 'feature',
    key: item.id,
  };
}

/**
 * Mapeia denyReason (do error-model) para mensagem legível
 */
function mapDenyReasonToMessage(reason: string): string {
  const messages: Record<string, string> = {
    'unauthenticated': 'Autenticação necessária',
    'forbidden': 'Permissão negada',
    'flagOff': 'Funcionalidade não disponível',
    'notFound': 'Não encontrado',
    'contextMissing': 'Contexto necessário',
  };
  
  return messages[reason] ?? 'Acesso negado';
}

/**
 * Conta quantos itens foram removidos/desabilitados durante o filtro
 */
export interface FilterStats {
  totalBefore: number;
  totalAfter: number;
  removed: number;
  disabled: number;
}

/**
 * Aplica filtro e retorna estatísticas
 */
export function filterNavigationTreeWithStats(
  tree: NavTree,
  accessDecision: IAccessDecisionServiceForNav,
  toolRegistry: IToolRegistryForFilter,
  options: NavigationFilterOptions = {}
): { tree: NavTree; stats: FilterStats } {
  const totalBefore = tree.groups.reduce((sum, g) => sum + g.items.length, 0);
  
  const filteredTree = filterNavigationTree(tree, accessDecision, toolRegistry, options);
  
  const totalAfter = filteredTree.groups.reduce((sum, g) => sum + g.items.length, 0);
  const disabledCount = filteredTree.groups.reduce(
    (sum, g) => sum + g.items.filter((i) => i.disabled).length,
    0
  );
  
  return {
    tree: filteredTree,
    stats: {
      totalBefore,
      totalAfter,
      removed: totalBefore - totalAfter,
      disabled: disabledCount,
    },
  };
}

/**
 * Verifica se um item específico passaria pelo filtro
 * Útil para testes e troubleshooting
 */
export function wouldPassFilter(
  item: NavItem,
  accessDecision: IAccessDecisionServiceForNav,
  toolRegistry: IToolRegistryForFilter,
  options: NavigationFilterOptions = {}
): { pass: boolean; reason?: string } {
  const opts = {
    removeHidden: options.removeHidden ?? true,
    disableInaccessible: options.disableInaccessible ?? true,
    removeEmptyGroups: options.removeEmptyGroups ?? true,
    applyToolStatus: options.applyToolStatus ?? true,
  };
  
  // Verificar status de tool
  if (item.toolKey && opts.applyToolStatus) {
    const status = toolRegistry.status(item.toolKey);
    if (!status.installed) {
      return { pass: false, reason: 'Tool não instalada' };
    }
    if (!status.enabled) {
      return { pass: false, reason: status.disabledReason ?? 'Tool desabilitada' };
    }
  }
  
  // Verificar canView
  const target = buildDecisionTarget(item);
  const canViewItem = accessDecision.canView(target);
  if (!canViewItem && opts.removeHidden) {
    return { pass: false, reason: 'Sem permissão de visualização' };
  }
  
  // Verificar canEnter
  const canEnterItem = accessDecision.canEnter(target);
  if (!canEnterItem && opts.disableInaccessible) {
    return { pass: false, reason: 'Sem permissão de acesso' };
  }
  
  return { pass: true };
}
