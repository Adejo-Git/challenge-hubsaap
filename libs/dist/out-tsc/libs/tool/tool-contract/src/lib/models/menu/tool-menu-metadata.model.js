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
/**
 * Categorias padrão para agrupamento de ferramentas no menu
 * Pode ser estendido conforme necessidade
 */
export var ToolCategory;
(function (ToolCategory) {
    /** Ferramentas principais/core */
    ToolCategory["Core"] = "core";
    /** Ferramentas de catálogo */
    ToolCategory["Catalog"] = "catalog";
    /** Ferramentas de gestão/administração */
    ToolCategory["Management"] = "management";
    /** Ferramentas de auditoria/compliance */
    ToolCategory["Compliance"] = "compliance";
    /** Ferramentas de relatórios/analytics */
    ToolCategory["Reports"] = "reports";
    /** Ferramentas de configuração */
    ToolCategory["Settings"] = "settings";
    /** Outras/customizadas */
    ToolCategory["Other"] = "other";
})(ToolCategory || (ToolCategory = {}));
/**
 * Ícones padrão recomendados para tools
 * Alinhados com o design system do Hub
 */
export var ToolIcon;
(function (ToolIcon) {
    ToolIcon["Dashboard"] = "dashboard";
    ToolIcon["List"] = "list";
    ToolIcon["Table"] = "table";
    ToolIcon["Document"] = "document";
    ToolIcon["Folder"] = "folder";
    ToolIcon["Chart"] = "chart";
    ToolIcon["Settings"] = "settings";
    ToolIcon["Users"] = "users";
    ToolIcon["Shield"] = "shield";
    ToolIcon["FileText"] = "file-text";
    ToolIcon["Calendar"] = "calendar";
    ToolIcon["Search"] = "search";
    ToolIcon["Filter"] = "filter";
    ToolIcon["Edit"] = "edit";
    ToolIcon["Plus"] = "plus";
    ToolIcon["Check"] = "check";
})(ToolIcon || (ToolIcon = {}));
//# sourceMappingURL=tool-menu-metadata.model.js.map