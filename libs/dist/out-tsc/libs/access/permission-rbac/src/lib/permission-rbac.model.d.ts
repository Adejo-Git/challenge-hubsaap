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
/**
 * Chave identificadora de uma permissão.
 * Formato recomendado: "scope.resource.action"
 */
export type PermissionKey = string;
/**
 * Chave identificadora de um role/grupo.
 * Formato recomendado: "ROLE_NAME" ou "RoleName"
 */
export type RoleKey = string;
/**
 * Conjunto efetivo de permissões concedidas a um usuário.
 * Representado como Set para eficiência em lookup e deduplicação.
 */
export type Grants = Set<PermissionKey>;
/**
 * Estratégia de resolução de permissões RBAC.
 *
 * - "claims-only": Permissões já vêm prontas no token/claims
 *   (ex.: JWT com array de permissions diretamente).
 *
 * - "map-based": Permissões derivadas a partir de roles
 *   usando um PermissionMap configurável.
 *
 * - "hybrid": Combina ambas (claims + map); útil para casos
 *   onde o backend provê permissions básicas mas roles podem
 *   expandir localmente no frontend.
 */
export type RbacStrategy = 'claims-only' | 'map-based' | 'hybrid';
/**
 * Resultado da função explain() - motivo técnico de allow/deny.
 * Não deve conter dados sensíveis (claims completas, tokens).
 */
export interface ExplainResult {
    /**
     * Código técnico do motivo.
     * Exemplos: "granted", "missing-permission", "missing-role", "invalid-key", "config-error"
     */
    code: ExplainCode;
    /**
     * Mensagem técnica curta (sem dados sensíveis).
     */
    message: string;
    /**
     * Detalhes adicionais (opcional) para debug.
     * Ex.: qual permission faltou, qual role foi checada.
     */
    details?: Record<string, unknown>;
}
/**
 * Códigos padronizados de explain / decisão RBAC.
 */
export type ExplainCode = 'granted' | 'missing-permission' | 'missing-role' | 'invalid-key' | 'config-error' | 'strategy-unsupported' | 'no-session' | 'cache-miss';
/**
 * Configuração de RBAC para o PermissionRbacService.
 */
export interface RbacConfig {
    /**
     * Estratégia de resolução de permissões.
     * Padrão: "claims-only"
     */
    strategy: RbacStrategy;
    /**
     * Habilitar cache de grants efetivos por sessão+contexto.
     * Padrão: true
     */
    enableCache?: boolean;
    /**
     * Habilitar telemetria de decisões (sem dados sensíveis).
     * Padrão: false
     */
    enableTelemetry?: boolean;
    /**
     * Validação restrita de PermissionKey (regex ou função customizada).
     * Se não fornecida, usa validação padrão (básica).
     */
    permissionKeyValidator?: (key: PermissionKey) => boolean;
    /**
     * Validação restrita de RoleKey (regex ou função customizada).
     * Se não fornecida, usa validação padrão (básica).
     */
    roleKeyValidator?: (key: RoleKey) => boolean;
}
/**
 * Entrada de claims/roles vindas da sessão (AuthSession).
 * Forma simplificada e segura (sem token raw).
 */
export interface ClaimsLite {
    /**
     * Identificador seguro da sessão (ex.: subject hash).
     */
    sessionId: string;
    /**
     * Roles do usuário (array).
     */
    roles?: RoleKey[];
    /**
     * Permissões diretas do usuário (array), se disponíveis no token.
     */
    permissions?: PermissionKey[];
    /**
     * Grupos adicionais (opcional, tratados como roles).
     */
    groups?: string[];
    /**
     * Contexto adicional (ex.: tenant, project) para resolução escopada.
     */
    context?: Record<string, unknown>;
}
/**
 * Comportamento de checagem múltipla (hasRole/hasPermission com array).
 */
export type CheckBehavior = 'any' | 'all';
/**
 * Opções para hasRole/hasPermission/resolveGrants.
 */
export interface CheckOptions {
    /**
     * Comportamento quando múltiplas keys são passadas.
     * - "any": retorna true se qualquer uma for válida (OR)
     * - "all": retorna true somente se todas forem válidas (AND)
     *
     * Padrão: "any"
     */
    behavior?: CheckBehavior;
    /**
     * Habilitar explain detalhado (gera ExplainResult internamente).
     * Padrão: false
     */
    explain?: boolean;
}
//# sourceMappingURL=permission-rbac.model.d.ts.map