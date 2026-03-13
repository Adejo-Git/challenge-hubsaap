/**
 * Navigation Models
 * 
 * Define os tipos da árvore de navegação (menu, breadcrumbs, active item).
 * Usado pelo NavigationService (Access Layer) para expor navegação segura ao Shell.
 */

/**
 * Tipo do item de navegação
 */
export type NavItemType = 'link' | 'group' | 'separator' | 'external';

/**
 * Item de navegação individual (menu ou quick action)
 */
export interface NavItem {
  /** ID estável (gerado a partir do toolKey/routeKey/url) */
  id: string;
  
  /** Label para exibição */
  label: string;
  
  /** Tipo do item */
  type: NavItemType;
  
  /** URL absoluta (ex: /tools/financeiro) ou relativa */
  url?: string;
  
  /** Route key (ex: tool.financeiro.dashboard) para matching preciso */
  routeKey?: string;
  
  /** Tool key (quando for item de tool) */
  toolKey?: string;
  
  /** Ícone (nome do design system) */
  icon?: string;
  
  /** Ordem de exibição (menor = mais acima) */
  order?: number;
  
  /** Badge opcional (ex: "new", contador) */
  badge?: {
    label: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  };
  
  /** Se o item está desabilitado (visível mas não clicável) */
  disabled?: boolean;
  
  /** Motivo da desabilitação (para tooltip/feedback) */
  disabledReason?: string;
  
  /** Metadados extras (ex: permissões associadas, flags) */
  meta?: Record<string, unknown>;
}

/**
 * Grupo de navegação (agrupa itens relacionados)
 */
export interface NavGroup {
  /** ID estável do grupo */
  id: string;
  
  /** Label do grupo (pode ser vazio para grupo sem header) */
  label?: string;
  
  /** Itens dentro do grupo */
  items: NavItem[];
  
  /** Ordem de exibição (menor = mais acima) */
  order?: number;
  
  /** Se o grupo está recolhido (para UI expansível) */
  collapsed?: boolean;
  
  /** Ícone do grupo */
  icon?: string;
}

/**
 * Árvore de navegação completa (menu)
 */
export interface NavTree {
  /** Grupos de navegação */
  groups: NavGroup[];
  
  /** Versão/timestamp para cache busting */
  version: number;
  
  /** Metadados da árvore (ex: contexto aplicado, total de itens) */
  meta?: {
    totalItems?: number;
    contextId?: string;
    generatedAt?: number;
  };
}

/**
 * Breadcrumb individual
 */
export interface Breadcrumb {
  /** Label para exibição */
  label: string;
  
  /** URL para navegação (se clicável) */
  url?: string;
  
  /** Se é o último item (página atual, não clicável) */
  isActive?: boolean;
  
  /** Ícone opcional */
  icon?: string;
  
  /** Tool key (quando for breadcrumb de tool) */
  toolKey?: string;
}

/**
 * Snapshot de navegação (estado atual)
 */
export interface NavigationSnapshot {
  /** Menu atual (árvore filtrada) */
  menu: NavTree;
  
  /** Breadcrumbs da rota atual */
  breadcrumbs: Breadcrumb[];
  
  /** Item ativo no menu (selecionado/highlight) */
  activeItem: NavItem | null;
  
  /** Timestamp do snapshot */
  timestamp: number;
}

/**
 * Configuração de navegação (itens fixos, ordem, grupos default)
 */
export interface NavigationConfig {
  /** Itens fixos do Shell (ex: Dashboard, Profile) */
  fixedItems?: NavItem[];
  
  /** Grupos default (quando tool não especificar) */
  defaultGroups?: Array<{
    id: string;
    label: string;
    order: number;
  }>;
  
  /** Ordem default de grupos */
  groupOrder?: Record<string, number>;
  
  /** Links externos (ex: Docs, Suporte) */
  externalLinks?: NavItem[];
  
  /** Separadores entre grupos */
  separators?: boolean;
}

/**
 * Metadados de navegação (para resolução de breadcrumbs/active item)
 */
export interface NavMeta {
  /** Tool key */
  toolKey?: string;
  
  /** Route key */
  routeKey?: string;
  
  /** URL normalizada */
  url: string;
  
  /** Título/label para breadcrumb */
  title: string;
  
  /** Nível de profundidade (0 = root, 1 = tool, 2 = page) */
  depth: number;
  
  /** Parent meta (para construir breadcrumbs) */
  parent?: NavMeta;
}
