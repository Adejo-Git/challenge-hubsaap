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
export function createPermissionRule(
  permissions: PermissionKey[],
  operator: RuleOperator = 'AND',
  options?: {
    description?: string;
    rules?: PermissionRule[];
  }
): PermissionRule {
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
export function createRouteRequirement(
  config: {
    permissions: PermissionKey[];
    operator?: RuleOperator;
    scopes?: PermissionScope[];
    requiredFeatures?: string[];
    description?: string;
  }
): RoutePermissionRequirement {
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
export function createActionRequirement(
  config: {
    permissions: PermissionKey[];
    operator?: RuleOperator;
    scopes?: PermissionScope[];
    requiredFeatures?: string[];
    description?: string;
  }
): ActionPermissionRequirement {
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
export function createToolPermissionMap(
  config: Omit<ToolPermissionMap, 'namespace'> & { namespace?: string }
): ToolPermissionMap {
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
export function isValidNamespace(
  permissionKey: PermissionKey,
  namespace: string
): boolean {
  return permissionKey.startsWith(`${namespace}.`);
}

/**
 * ✅ SPEC: Helper - extrair todas as permission keys de um mapa
 */
export function extractAllPermissionKeys(
  permissionMap: ToolPermissionMap
): PermissionKey[] {
  const keys = new Set<PermissionKey>();
  
  // Helper para extrair de regra recursivamente
  const extractFromRule = (rule: PermissionRule): void => {
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
export function validatePermissionMap(
  permissionMap: ToolPermissionMap
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validar namespace
  if (!permissionMap.namespace) {
    errors.push('Namespace is required');
  }
  
  // Helper para validar regra
  const validateRule = (
    rule: PermissionRule,
    context: string,
    depth = 0
  ): void => {
    // Validar permissões não vazias
    if (!rule.permissions || rule.permissions.length === 0) {
      if (!rule.rules || rule.rules.length === 0) {
        errors.push(`${context}: Regra vazia (sem permissions nem rules aninhadas)`);
      }
    }
    
    // Validar namespace nas permissions
    rule.permissions.forEach(key => {
      if (!isValidNamespace(key, permissionMap.namespace)) {
        errors.push(
          `${context}: Permission key "${key}" deve começar com namespace "${permissionMap.namespace}"`
        );
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
    warnings.push(
      `Granularidade excessiva: ${allKeys.length} permission keys únicas. ` +
      `Considere consolidar permissões relacionadas.`
    );
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
