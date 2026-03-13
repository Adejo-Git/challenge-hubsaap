/**
 * Tool Contract Models
 * 
 * Define os tipos do contrato reutilizável Tool↔Hub.
 * Estes tipos são usados pelas Tools para publicar seus metadados,
 * flags, permissões e rotas de forma tipada e padronizada.
 * 
 * Design principles:
 * - Keys namespaceadas por toolKey (ex: 'myTool.feature.create')
 * - Versionável (campos opcionais para evolução)
 * - Sem IO (apenas types, sem HttpClient)
 * - Validável em build-time
 */

import { ToolPermissionMap } from './tool-permission-map.model';

/**
 * Identificador único e estável da Tool
 * Deve ser único no Hub, kebab-case recomendado
 * 
 * Exemplos: 'financeiro', 'rh-core', 'audit-trail'
 * 
 * Note: Branded type para type safety semântico
 */
export type ToolKey = string & { readonly __brand: 'ToolKey' };

/**
 * Tipo de permissão namespaceada
 * Formato: `${toolKey}.${scope}.${action}`
 * 
 * Exemplos: 
 * - 'financeiro.invoices.create'
 * - 'rh-core.employees.read'
 * 
 * Note: Branded type para type safety semântico
 */
export type PermissionKey = string & { readonly __brand: 'PermissionKey' };

/**
 * Tipo de feature flag namespaceada
 * Formato: `${toolKey}.${featureName}`
 * 
 * Exemplos:
 * - 'financeiro.new-invoice-flow'
 * - 'audit-trail.export-pdf'
 * 
 * Note: Branded type para type safety semântico
 */
export type FeatureKey = string & { readonly __brand: 'FeatureKey' };

/**
 * Deep link para navegação dentro da Tool
 * Paths são relativos à rota base da tool
 */
export interface ToolDeepLink {
  /** Identificador único do deep link */
  id: string;
  
  /** Path relativo à rota base da tool (ex: 'invoices/create') */
  path: string;
  
  /** Label para exibição */
  label: string;
  
  /** Descrição opcional */
  description?: string;
  
  /** Ícone opcional (nome do ícone do design system) */
  icon?: string;
  
  /** Permissões necessárias para acessar este link */
  requiredPermissions?: PermissionKey[];
  
  /** Features flags necessárias para exibir este link */
  requiredFeatures?: FeatureKey[];
}

/**
 * Item de menu da Tool
 */
export interface ToolMenuItem {
  /** ID único do item no contexto da tool */
  id: string;
  
  /** Label para exibição */
  label: string;
  
  /** Path relativo (se for link direto) */
  path?: string;
  
  /** Ícone opcional */
  icon?: string;
  
  /** Ordem de exibição (menor = mais acima) */
  order?: number;
  
  /** Sub-items (menu hierárquico) */
  children?: ToolMenuItem[];
  
  /** Permissões necessárias para ver este item */
  requiredPermissions?: PermissionKey[];
  
  /** Features necessárias para exibir este item */
  requiredFeatures?: FeatureKey[];
  
  /** Badge opcional (ex: 'NEW', 'BETA') */
  badge?: string;
}

/**
 * Template para breadcrumb
 * Define como o breadcrumb deve ser construído para a tool
 */
export interface BreadcrumbTemplate {
  /** Label estático ou template */
  label: string;
  
  /** Ícone opcional */
  icon?: string;
  
  /** Se true, usa dados dinâmicos do contexto para o label */
  isDynamic?: boolean;
  
  /** Campo do contexto a usar para label dinâmico */
  contextField?: string;
}

/**
 * Metadata do menu da Tool
 * Publicado pela Tool para o Hub construir o menu integrado
 */
export interface ToolMenuMetadata {
  /** Key única da tool */
  toolKey: ToolKey;
  
  /** Nome da tool para exibição */
  displayName: string;
  
  /** Descrição curta */
  description?: string;
  
  /** Ícone principal da tool */
  icon?: string;
  
  /** Ordem no menu principal (menor = mais acima) */
  order?: number;
  
  /** Itens de menu da tool */
  menuItems: ToolMenuItem[];
  
  /** Deep links principais (para atalhos/busca rápida) */
  deepLinks?: ToolDeepLink[];
  
  /** Categoria da tool (para agrupamento no menu) */
  category?: string;
  
  /** Indica se tool é beta/experimental */
  isBeta?: boolean;
  
  /** 
   * Chave para Access Decision Service
   * Usado pelo Hub para determinar visibilidade/acesso ao menu
   * Formato: 'tool.<toolKey>.menu' 
   */
  accessKey: string;
  
  /** Template para breadcrumb (opcional) */
  breadcrumbTemplate?: BreadcrumbTemplate;
}

/**
 * Feature flags da Tool
 * Mapa de features com valores default
 */
export interface ToolFeatureFlags {
  /** Key única da tool */
  toolKey: ToolKey;
  
  /** Mapa: featureKey → default value (antes de decisão do FeatureFlagService) */
  features: Record<FeatureKey, boolean>;
  
  /** Descrições das features (para documentação/admin UI) */
  featureDescriptions?: Record<FeatureKey, string>;
}

/**
 * Escopos de permissão da Tool
 */
export interface ToolPermissionScope {
  /** ID do escopo (ex: 'invoices', 'employees') */
  scopeId: string;
  
  /** Label do escopo */
  label: string;
  
  /** Ações disponíveis neste escopo */
  actions: {
    actionId: string;
    label: string;
    description?: string;
  }[];
}

/**
 * Mapa de permissões da Tool (VERSÃO LEGADO)
 * 
 * @deprecated Use ToolPermissionMap from './tool-permission-map.model' instead
 * 
 * Esta interface será removida na v2.0.0.
 * A nova versão oferece:
 * - Mapeamento declarativo de rotas/ações/capabilities
 * - Suporte a operadores AND/OR
 * - Regras aninhadas
 * - Validação de integridade
 * 
 * Migration:
 * ```typescript
 * // Antes (legado)
 * const map: ToolPermissionMapLegacy = {
 *   toolKey: 'tax-map',
 *   scopes: [...]
 * };
 * 
 * // Depois (nova versão)
 * import { ToolPermissionMap, createToolPermissionMap } from '@hub/tool-contract';
 * const map = createToolPermissionMap({
 *   toolKey: 'tax-map',
 *   version: '1.0.0',
 *   namespace: 'tax-map',
 *   routes: {...},
 *   actions: {...}
 * });
 * ```
 */
export interface ToolPermissionMapLegacy {
  /** Key única da tool */
  toolKey: ToolKey;
  
  /** Escopos de permissão organizados */
  scopes: ToolPermissionScope[];
  
  /** Lista flat de todas as permissionKeys (gerada a partir de scopes) */
  allPermissions?: PermissionKey[];
}

/**
 * Data adicional para rotas da Tool
 * Usada em RouteData para configurar guards/menu/breadcrumbs
 */
export interface ToolRouteData {
  /** Título da rota (para breadcrumbs) */
  title?: string;
  
  /** Permissões necessárias para acessar a rota */
  requiredPermissions?: PermissionKey[];
  
  /** Features necessárias para acessar a rota */
  requiredFeatures?: FeatureKey[];
  
  /** Indica se rota requer autenticação */
  requiresAuth?: boolean;
  
  /** Indica se rota deve aparecer no breadcrumb */
  showInBreadcrumb?: boolean;
  
  /** Ícone para o breadcrumb/menu */
  icon?: string;
  
  /** Metadata adicional customizável */
  [key: string]: unknown;
}

/**
 * Requisitos de contexto da Tool
 * Define quais níveis de contexto a tool requer para funcionar
 */
export interface ToolContextRequirements {
  /** Indica se a tool requer tenant selecionado */
  requiresTenant: boolean;
  
  /** Indica se a tool requer client selecionado */
  requiresClient?: boolean;
  
  /** Indica se a tool requer project selecionado */
  requiresProject?: boolean;
  
  /** Escopos permitidos onde a tool pode operar */
  allowedScopes: ('tenant' | 'client' | 'project')[];
}

/**
 * Capabilities da Tool
 * Define as capacidades e ações suportadas pela tool
 */
export interface ToolCapabilities {
  /** Ações disponíveis na tool (ex: 'create', 'edit', 'approve', 'export') */
  actions: string[];
  
  /** Contextos/escopos onde a tool pode operar */
  scopes: string[];
  
  /** Features opcionais suportadas */
  features?: string[];
}

/**
 * Lifecycle hooks da Tool
 * Callbacks para eventos de ciclo de vida
 */
export interface ToolLifecycleHooks {
  /**
   * Chamado quando o contexto ativo muda
   * Permite que a tool reaja a mudanças de tenant/client/project
   */
  onContextChange?: (
    oldContext: Record<string, unknown> | null,
    newContext: Record<string, unknown>
  ) => void | Promise<void>;
  
  /**
   * Chamado quando a tool está sendo descarregada
   * Permite cleanup de recursos (cancelar requests, limpar cache, etc)
   */
  onUnload?: () => void | Promise<void>;
  
  /**
   * Validação customizada antes de ativar a tool
   * Retorna true se a tool pode ser ativada no contexto atual
   */
  canActivate?: (context: Record<string, unknown>) => boolean | Promise<boolean>;
}

/**
 * Contrato completo publicado por uma Tool
 * Agregação de todos os metadados necessários para integração
 */
export interface ToolContract {
  /** Key única da tool */
  toolKey: ToolKey;
  
  /** Versão do contrato (para versionamento) */
  contractVersion: string;
  
  /** Metadata do menu */
  menu: ToolMenuMetadata;
  
  /** Feature flags */
  featureFlags: ToolFeatureFlags;
  
  /**
   * Mapa de permissões (NOVA VERSÃO)
   * 
   * ✅ RECOMENDADO: Use esta versão completa com suporte a:
   * - Mapeamento declarativo de rotas/ações/capabilities
   * - Operadores AND/OR
   * - Regras aninhadas
   * - Validação de integridade
   */
  permissionMap?: ToolPermissionMap;
  
  /**
   * Mapa de permissões (VERSÃO LEGADO)
   * 
   * @deprecated Use permissionMap instead (será removido na v2.0.0)
   */
  permissions?: ToolPermissionMapLegacy;
  
  /** 
   * Requisitos de contexto (tenant/client/project) 
   * @default { requiresTenant: true, allowedScopes: ['tenant'] }
   */
  contextRequirements?: ToolContextRequirements;
  
  /** 
   * Capabilities e ações suportadas 
   * @default { actions: ['view'], scopes: ['tenant'] }
   */
  capabilities?: ToolCapabilities;
  
  /** Lifecycle hooks (opcional) */
  lifecycle?: ToolLifecycleHooks;
  
  /** Timestamp de criação do contrato */
  createdAt?: number;
}

/**
 * Resultado de validação do contrato
 */
export interface ToolContractValidationResult {
  /** Indica se o contrato é válido */
  isValid: boolean;
  
  /** Lista de erros (se houver) */
  errors: string[];
  
  /** Lista de warnings (não bloqueantes) */
  warnings: string[];
}

/**
 * Contrato de erro seguro para consumo em UI/SDK.
 * Campos opcionais permitem normalização por camadas distintas.
 */
export interface StandardError {
  message: string;
  code?: string;
  category?: string;
  correlationId?: string;
}
