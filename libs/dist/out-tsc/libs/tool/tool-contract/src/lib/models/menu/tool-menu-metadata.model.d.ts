/**
 * Tool Menu Metadata - Tipos auxiliares
 *
 * Fornece tipos adicionais e enums para facilitar a construção
 * de ToolMenuMetadata de forma tipada e consistente.
 *
 * Responsabilidades:
 * - Definir enums/constantes para categorias, ícones padrão, etc.
 * - Fornecer tipos auxiliares para builders
 * - Garantir consistência entre tools
 */
import type { ToolMenuMetadata, ToolMenuItem, ToolDeepLink } from '../tool-contract.model';
/**
 * Categorias padrão para agrupamento de ferramentas no menu
 * Pode ser estendido conforme necessidade
 */
export declare enum ToolCategory {
    /** Ferramentas principais/core */
    Core = "core",
    /** Ferramentas de catálogo */
    Catalog = "catalog",
    /** Ferramentas de gestão/administração */
    Management = "management",
    /** Ferramentas de auditoria/compliance */
    Compliance = "compliance",
    /** Ferramentas de relatórios/analytics */
    Reports = "reports",
    /** Ferramentas de configuração */
    Settings = "settings",
    /** Outras/customizadas */
    Other = "other"
}
/**
 * Ícones padrão recomendados para tools
 * Alinhados com o design system do Hub
 */
export declare enum ToolIcon {
    Dashboard = "dashboard",
    List = "list",
    Table = "table",
    Document = "document",
    Folder = "folder",
    Chart = "chart",
    Settings = "settings",
    Users = "users",
    Shield = "shield",
    FileText = "file-text",
    Calendar = "calendar",
    Search = "search",
    Filter = "filter",
    Edit = "edit",
    Plus = "plus",
    Check = "check"
}
/**
 * Configuração parcial para construção de ToolMenuMetadata
 * Usado em builders para simplificar criação
 */
export type ToolMenuMetadataConfig = Omit<ToolMenuMetadata, 'toolKey'> & {
    toolKey?: string;
};
/**
 * Resultado de validação de ToolMenuMetadata
 */
export interface ToolMenuMetadataValidation {
    /** Indica se o metadata é válido */
    isValid: boolean;
    /** Erros encontrados (bloqueantes) */
    errors: string[];
    /** Avisos (não bloqueantes) */
    warnings: string[];
}
/**
 * Contexto para construção de deep links
 * Facilita manter consistência entre rotas e deep links
 */
export interface ToolRouteContext {
    /** Rota base da tool */
    basePath: string;
    /** Rotas internas definidas */
    routes: Record<string, string>;
}
/**
 * Deep link builder result (fluent API)
 */
export interface DeepLinkBuilder {
    /** ID do deep link */
    withId(id: string): DeepLinkBuilder;
    /** Path relativo */
    withPath(path: string): DeepLinkBuilder;
    /** Label */
    withLabel(label: string): DeepLinkBuilder;
    /** Descrição opcional */
    withDescription(description: string): DeepLinkBuilder;
    /** Ícone opcional */
    withIcon(icon: string): DeepLinkBuilder;
    /** Permissões necessárias */
    requiresPermissions(...permissions: string[]): DeepLinkBuilder;
    /** Features necessárias */
    requiresFeatures(...features: string[]): DeepLinkBuilder;
    /** Constrói o deep link */
    build(): ToolDeepLink;
}
/**
 * Menu item builder result (fluent API)
 */
export interface MenuItemBuilder {
    /** ID do item */
    withId(id: string): MenuItemBuilder;
    /** Label */
    withLabel(label: string): MenuItemBuilder;
    /** Path relativo */
    withPath(path: string): MenuItemBuilder;
    /** Ícone opcional */
    withIcon(icon: string): MenuItemBuilder;
    /** Ordem de exibição */
    withOrder(order: number): MenuItemBuilder;
    /** Badge opcional */
    withBadge(badge: string): MenuItemBuilder;
    /** Sub-items */
    withChildren(...children: ToolMenuItem[]): MenuItemBuilder;
    /** Permissões necessárias */
    requiresPermissions(...permissions: string[]): MenuItemBuilder;
    /** Features necessárias */
    requiresFeatures(...features: string[]): MenuItemBuilder;
    /** Constrói o menu item */
    build(): ToolMenuItem;
}
//# sourceMappingURL=tool-menu-metadata.model.d.ts.map