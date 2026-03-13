/**
 * @file permission-rbac.model.ts
 * @description Tipos e contratos públicos para o sistema RBAC do Hub-Saap.
 *
 * Convenção de nomes para PermissionKey:
 * - Formato: "scope.resource.action"
 * - Escopo: tool | global | system | feature
 * - Recurso: entidade ou funcionalidade (ex.: pip, project, report)
 * - Ação: read | write | delete | execute | manage
 *
 * Exemplos:
 * - "tool.pip.read"          → Ler dados do PIP
 * - "tool.pip.write"         → Editar dados do PIP
 * - "tool.pip.manage"        → Gerenciar ciclo de vida do PIP
 * - "global.admin"           → Admin global
 * - "feature.analytics.read" → Ler analytics
 *
 * Convenção para RoleKey:
 * - Formato: maiúsculas separadas por underscores ou formato livre
 * - Exemplos: "ADMIN", "PROJECT_MANAGER", "VIEWER", "PIP_EDITOR"
 *
 * IMPORTANTE:
 * - Estas convenções garantem previsibilidade no cache, validação e explain().
 * - Permissões sempre são lowercase para normalização consistente.
 * - Roles preservam case original (mas comparação é case-insensitive).
 */
export {};
//# sourceMappingURL=permission-rbac.model.js.map