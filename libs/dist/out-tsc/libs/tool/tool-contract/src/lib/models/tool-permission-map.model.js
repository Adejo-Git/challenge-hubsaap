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
/**
 * ✅ SPEC: Factory helper para criação de PermissionRule
 *
 * Facilita criação de regras simples.
 */
export function createPermissionRule(permissions, operator = 'AND', options) {
    return {
        operator,
        permissions,
        description: options?.description,
        rules: options?.rules
    };
}
/**
 * ✅ SPEC: Factory helper para criação de RoutePermissionRequirement
 */
export function createRouteRequirement(config) {
    return {
        rule: {
            operator: config.operator ?? 'AND',
            permissions: config.permissions
        },
        scopes: config.scopes,
        requiredFeatures: config.requiredFeatures,
        description: config.description
    };
}
/**
 * ✅ SPEC: Factory helper para criação de ActionPermissionRequirement
 */
export function createActionRequirement(config) {
    return {
        rule: {
            operator: config.operator ?? 'AND',
            permissions: config.permissions
        },
        scopes: config.scopes,
        requiredFeatures: config.requiredFeatures,
        description: config.description
    };
}
/**
 * ✅ SPEC: Factory helper para criação de ToolPermissionMap
 *
 * Facilita criação com defaults seguros.
 */
export function createToolPermissionMap(config) {
    const namespace = config.namespace ?? config.toolKey;
    return {
        toolKey: config.toolKey,
        version: config.version,
        namespace,
        routes: config.routes,
        actions: config.actions,
        capabilities: config.capabilities,
        metadata: config.metadata
    };
}
/**
 * ✅ SPEC: Helper - validar se permission key pertence ao namespace
 */
export function isValidNamespace(permissionKey, namespace) {
    return permissionKey.startsWith(`${namespace}.`);
}
/**
 * ✅ SPEC: Helper - extrair todas as permission keys de um mapa
 */
export function extractAllPermissionKeys(permissionMap) {
    const keys = new Set();
    // Helper para extrair de regra recursivamente
    const extractFromRule = (rule) => {
        rule.permissions.forEach(key => keys.add(key));
        rule.rules?.forEach(extractFromRule);
    };
    // Extrair de routes
    if (permissionMap.routes) {
        Object.values(permissionMap.routes).forEach(req => {
            extractFromRule(req.rule);
        });
    }
    // Extrair de actions
    if (permissionMap.actions) {
        Object.values(permissionMap.actions).forEach(req => {
            extractFromRule(req.rule);
        });
    }
    // Extrair de capabilities
    if (permissionMap.capabilities) {
        Object.values(permissionMap.capabilities).forEach(req => {
            extractFromRule(req.rule);
        });
    }
    return Array.from(keys);
}
/**
 * ✅ SPEC: Helper - validar integridade de um ToolPermissionMap
 *
 * Valida:
 * - Namespace presente
 * - Permission keys únicas
 * - Nenhuma regra vazia
 * - Formato de keys (namespace.action)
 */
export function validatePermissionMap(permissionMap) {
    const errors = [];
    const warnings = [];
    // Validar namespace
    if (!permissionMap.namespace) {
        errors.push('Namespace is required');
    }
    // Helper para validar regra
    const validateRule = (rule, context, depth = 0) => {
        // Validar permissões não vazias
        if (!rule.permissions || rule.permissions.length === 0) {
            if (!rule.rules || rule.rules.length === 0) {
                errors.push(`${context}: Regra vazia (sem permissions nem rules aninhadas)`);
            }
        }
        // Validar namespace nas permissions
        rule.permissions.forEach(key => {
            if (!isValidNamespace(key, permissionMap.namespace)) {
                errors.push(`${context}: Permission key "${key}" deve começar com namespace "${permissionMap.namespace}"`);
            }
        });
        // Validar profundidade de aninhamento
        if (depth > 2) {
            warnings.push(`${context}: Aninhamento profundo (depth ${depth}) pode dificultar manutenção`);
        }
        // Recursão para regras aninhadas
        rule.rules?.forEach((nestedRule, idx) => {
            validateRule(nestedRule, `${context}.rules[${idx}]`, depth + 1);
        });
    };
    // Validar routes
    if (permissionMap.routes) {
        Object.entries(permissionMap.routes).forEach(([route, req]) => {
            validateRule(req.rule, `routes["${route}"]`);
        });
    }
    // Validar actions
    if (permissionMap.actions) {
        Object.entries(permissionMap.actions).forEach(([action, req]) => {
            validateRule(req.rule, `actions["${action}"]`);
        });
    }
    // Validar capabilities
    if (permissionMap.capabilities) {
        Object.entries(permissionMap.capabilities).forEach(([capability, req]) => {
            validateRule(req.rule, `capabilities["${capability}"]`);
        });
    }
    // Validar granularidade excessiva
    const allKeys = extractAllPermissionKeys(permissionMap);
    if (allKeys.length > 50) {
        warnings.push(`Granularidade excessiva: ${allKeys.length} permission keys únicas. ` +
            `Considere consolidar permissões relacionadas.`);
    }
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
//# sourceMappingURL=tool-permission-map.model.js.map