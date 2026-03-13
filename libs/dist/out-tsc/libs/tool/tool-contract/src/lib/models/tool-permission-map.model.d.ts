/**
 * ✅ CONFORMIDADE: tool-permission-map.spec.json
 *
 * Contrato declarativo de permissões da Tool.
 * Descreve requisitos de acesso por rota/capacidade/ação para o Hub aplicar decisão centralizada.
 *
 * RESPONSABILIDADES:
 * - Declarar permissões mínimas por rota/capacidade/ação relevantes da tool
 * - Manter chaves estáveis e namespaceadas por tool
 * - Permitir que o Hub aplique autorização central
 * - Separar "entrada/visualização" de "ações" (view vs edit vs approve)
 *
 * NÃO RESPONSABILIDADES:
 * - ❌ Não implementar verificação de permissão (motor é do Hub)
 * - ❌ Não fazer chamadas HTTP para validar permissões
 * - ❌ Não duplicar RBAC/ABAC/policies dentro da tool
 * - ❌ Não conter regras de fallback (401/403/404)
 */
import { PermissionKey } from './tool-contract.model';
import type { ToolPermissionScope } from './tool-contract.model';
/**
 * ✅ SPEC: RuleOperator (AND/OR)
 *
 * Operadores lógicos para composição de permissões.
 */
export type RuleOperator = 'AND' | 'OR';
/**
 * ✅ SPEC: PermissionRule
 *
 * Regra declarativa de permissões com operador lógico.
 *
 * EXEMPLOS:
 * ```typescript
 * // Requer TODAS as permissões (AND)
 * {
 *   operator: 'AND',
 *   permissions: ['documents.read', 'documents.export']
 * }
 *
 * // Requer QUALQUER permissão (OR)
 * {
 *   operator: 'OR',
 *   permissions: ['documents.admin', 'documents.approve']
 * }
 * ```
 */
export interface PermissionRule {
    /**
     * Operador lógico para combinar permissões.
     * - AND: usuário deve ter TODAS as permissões listadas
     * - OR: usuário deve ter PELO MENOS UMA permissão listada
     */
    operator: RuleOperator;
    /**
     * Lista de permissões a serem avaliadas conforme operador.
     */
    permissions: PermissionKey[];
    /**
     * Descrição opcional da regra (para auditoria/documentação).
     */
    description?: string;
    /**
     * Regras aninhadas (permite composições complexas como (A AND B) OR (C AND D)).
     */
    rules?: PermissionRule[];
}
/**
 * ✅ SPEC: Levels/Scopes (opcional)
 *
 * Escopo declarativo para orientar decisão no Hub.
 */
export type PermissionScope = 'tenant' | 'client' | 'project';
/**
 * ✅ SPEC: RoutePermissionRequirement
 *
 * Requisitos de permissão para uma rota específica.
 *
 * EXEMPLO:
 * ```typescript
 * {
 *   rule: {
 *     operator: 'AND',
 *     permissions: ['documents.read' as PermissionKey]
 *   },
 *   scopes: ['tenant', 'client'],
 *   requiredFeatures: ['advanced-search'],
 *   description: 'Read access to documents list'
 * }
 * ```
 */
export interface RoutePermissionRequirement {
    /**
     * Regra de permissões necessárias para acessar a rota.
     */
    rule: PermissionRule;
    /**
     * Escopos permitidos para executar a ação.
     * Se omitido, assume escopo do contexto ativo.
     */
    scopes?: PermissionScope[];
    /**
     * Feature flags opcionais que devem estar habilitadas.
     * Relacionamento declarativo: certas permissões só fazem sentido com feature habilitada.
     */
    requiredFeatures?: string[];
    /**
     * Descrição opcional (para auditoria/documentação).
     */
    description?: string;
}
/**
 * ✅ SPEC: ActionPermissionRequirement
 *
 * Requisitos de permissão para uma ação/capability específica.
 */
export interface ActionPermissionRequirement {
    /**
     * Regra de permissões necessárias para executar a ação.
     */
    rule: PermissionRule;
    /**
     * Escopos permitidos para executar a ação.
     */
    scopes?: PermissionScope[];
    /**
     * Feature flags opcionais.
     */
    requiredFeatures?: string[];
    /**
     * Descrição opcional.
     */
    description?: string;
}
/**
 * ✅ SPEC: PermissionMapMetadata
 *
 * Metadados versionáveis para auditoria.
 */
export interface PermissionMapMetadata {
    /**
     * Versão do permission map (semver recomendado).
     */
    version: string;
    /**
     * Timestamp da última atualização.
     */
    lastUpdated?: string;
    /**
     * Owner/responsável pelo mapa.
     */
    owner?: string;
    /**
     * Descrição geral do mapa.
     */
    description?: string;
}
/**
 * ✅ SPEC: ToolPermissionMap
 *
 * Contrato completo de permissões de uma Tool.
 *
 * ESTRUTURA:
 * - toolKey: identificador da tool
 * - version: versão do contrato (para backwards compatibility)
 * - namespace: prefixo das permission keys (ex: "tax-map")
 * - routes: mapeamento de rotas para requisitos
 * - actions: mapeamento de ações (capabilities) para regras
 * - capabilities: mapeamento de features opcionais para regras
 * - metadata: metadados versionáveis
 *
 * EXEMPLO COMPLETO:
 * ```typescript
 * const TOOL_PERMISSION_MAP: ToolPermissionMap = {
 *   toolKey: 'tax-map',
 *   version: '1.0.0',
 *   namespace: 'tax-map',
 *
 *   routes: {
 *     '/list': {
 *       rule: {
 *         operator: 'OR',
 *         permissions: ['tax-map.view' as PermissionKey]
 *       },
 *       scopes: ['tenant', 'client'],
 *       description: 'Access tax parcels list'
 *     }
 *   },
 *
 *   actions: {
 *     'view': {
 *       rule: {
 *         operator: 'OR',
 *         permissions: ['tax-map.view' as PermissionKey, 'tax-map.admin' as PermissionKey]
 *       }
 *     }
 *   },
 *
 *   metadata: {
 *     version: '1.0.0',
 *     lastUpdated: '2024-03-02T00:00:00Z',
 *     owner: 'tax-map-team'
 *   }
 * };
 * ```
 */
export interface ToolPermissionMap {
    /**
     * Identificador único da tool (ToolKey).
     */
    toolKey: string;
    /**
     * Versão do contrato (semver recomendado).
     * Importante para backwards compatibility.
     */
    version: string;
    /**
     * Namespace das permission keys (ex: "tax-map").
     * Usado para prefixar todas as chaves e evitar colisões.
     */
    namespace: string;
    /**
     * Mapeamento de rotas internas para requisitos de permissão.
     *
     * Chave: caminho da rota (ex: '/list', '/create', '/approve/:id')
     * Valor: RoutePermissionRequirement
     *
     * USO:
     * - RouteGuards avaliam acesso a rotas internas
     * - NavigationService filtra deep links por permissão
     */
    routes?: Record<string, RoutePermissionRequirement>;
    /**
     * Mapeamento de ações (capabilities) para regras de permissão.
     *
     * Chave: nome da ação (ex: 'view', 'edit', 'approve', 'export')
     * Valor: ActionPermissionRequirement
     *
     * USO:
     * - AccessDecisionService computa capabilities permitidas
     * - Tool consome para ajustar UX (esconder/disable botões)
     */
    actions?: Record<string, ActionPermissionRequirement>;
    /**
     * Mapeamento de features opcionais para regras de permissão.
     *
     * Chave: nome da feature (ex: 'bulk-operations', 'advanced-filters')
     * Valor: ActionPermissionRequirement
     *
     * USO:
     * - Habilitar funcionalidades avançadas condicionalmente
     * - Integração com ToolFeatureFlags
     */
    capabilities?: Record<string, ActionPermissionRequirement>;
    /**
     * Escopos estruturados de permissão (para visualização/catálogo no Hub).
     *
     * Opcional: usado para construir UI de gestão de permissões.
     * Organiza as permission keys em grupos lógicos (view, action, admin, etc).
     */
    scopes?: ToolPermissionScope[];
    /**
     * Lista plana de todas as permission keys da tool.
     *
     * Opcional: usado para auditoria e validação.
     * Deve conter todas as chaves presentes em routes/actions/capabilities.
     */
    allPermissions?: PermissionKey[];
    /**
     * Metadados versionáveis para auditoria e catálogo.
     */
    metadata?: PermissionMapMetadata;
}
/**
 * ✅ SPEC: Factory helper para criação de PermissionRule
 *
 * Facilita criação de regras simples.
 */
export declare function createPermissionRule(permissions: PermissionKey[], operator?: RuleOperator, options?: {
    description?: string;
    rules?: PermissionRule[];
}): PermissionRule;
/**
 * ✅ SPEC: Factory helper para criação de RoutePermissionRequirement
 */
export declare function createRouteRequirement(config: {
    permissions: PermissionKey[];
    operator?: RuleOperator;
    scopes?: PermissionScope[];
    requiredFeatures?: string[];
    description?: string;
}): RoutePermissionRequirement;
/**
 * ✅ SPEC: Factory helper para criação de ActionPermissionRequirement
 */
export declare function createActionRequirement(config: {
    permissions: PermissionKey[];
    operator?: RuleOperator;
    scopes?: PermissionScope[];
    requiredFeatures?: string[];
    description?: string;
}): ActionPermissionRequirement;
/**
 * ✅ SPEC: Factory helper para criação de ToolPermissionMap
 *
 * Facilita criação com defaults seguros.
 */
export declare function createToolPermissionMap(config: Omit<ToolPermissionMap, 'namespace'> & {
    namespace?: string;
}): ToolPermissionMap;
/**
 * ✅ SPEC: Helper - validar se permission key pertence ao namespace
 */
export declare function isValidNamespace(permissionKey: PermissionKey, namespace: string): boolean;
/**
 * ✅ SPEC: Helper - extrair todas as permission keys de um mapa
 */
export declare function extractAllPermissionKeys(permissionMap: ToolPermissionMap): PermissionKey[];
/**
 * ✅ SPEC: Helper - validar integridade de um ToolPermissionMap
 *
 * Valida:
 * - Namespace presente
 * - Permission keys únicas
 * - Nenhuma regra vazia
 * - Formato de keys (namespace.action)
 */
export declare function validatePermissionMap(permissionMap: ToolPermissionMap): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=tool-permission-map.model.d.ts.map