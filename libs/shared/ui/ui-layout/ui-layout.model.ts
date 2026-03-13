// src/app/lib/ui-layout/ui-layout.model.ts

/**
 * Estado global do layout.
 * O ui-layout NÃO altera esse estado, apenas consome.
 */
export interface LayoutState {
    isMobile?: boolean;
    sidebar?: SidebarState;
    rightPanel?: RightPanelState;
}

/**
 * Estado da Sidebar
 */
export interface SidebarState {
    collapsed: boolean;
    mobileOpen?: boolean;
}

/**
 * Estado do Right Panel
 */
export interface RightPanelState {
    open: boolean;
}

/**
 * Slots documentados do LayoutShell
 * (apenas contrato, não implementação)
 */
export interface LayoutSlots {
    topbar?: unknown;
    sidebar?: unknown;
    content?: unknown;
    rightPanel?: unknown;
}
