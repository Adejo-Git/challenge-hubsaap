/**
 * ToolPermissionMap — Contrato declarativo de permissões
 *
 * Arquivo: tool.permission-map.ts
 *
 * Responsabilidades:
 * - Exportar TOOL_PERMISSION_RULE_MAP: mapeamento alvo → regra declarativa.
 * - Exportar TOOL_PERMISSION_MAP: contrato compatível com @hub/tool-contract.
 *
 * Regras de ouro:
 * - Zero lógica executável: apenas dados declarativos.
 * - Zero chamadas HTTP ou injeção de dependências.
 * - O Hub (não a tool) avalia as regras e decide o acesso.
 * - Granularidade mínima suficiente — evitar "ACL infinito".
 *
 * Integração:
 * - Consumido por tool.contract.ts para montagem do contrato do plugin.
 * - Referenciado por tool.routes.ts e tool.menu-metadata.ts via TAX_MAP_PERMISSION_KEYS.
 */

import type { ToolPermissionMap, ToolPermissionScope, ToolKey, PermissionKey } from '@hub/tool-contract';
import {
  TAX_MAP_PERMISSION_KEYS as K,
  type ToolPermissionRuleMap,
} from './tool.permission-map.model';

// ---------------------------------------------------------------------------
// Mapa declarativo de regras por alvo
// ---------------------------------------------------------------------------

/**
 * TOOL_PERMISSION_RULE_MAP
 *
 * Mapeia cada alvo (rota ou ação) à sua regra de permissão.
 * Este mapa é a fonte de verdade para o Hub tomar decisões de autorização.
 *
 * Separação de escopos:
 * - "route:*"  → controla entrada/visualização (guards de rota no Hub).
 * - "action:*" → controla capacidades funcionais (botões, dialogs, exports).
 *
 * Operadores:
 * - OR  → qualquer chave listada autoriza o acesso (padrão mais comum).
 * - AND → todas as chaves são obrigatórias (use para ações sensíveis).
 */
export const TOOL_PERMISSION_RULE_MAP: ToolPermissionRuleMap = {
  //
  // Rotas — Visualização
  //
  'route:home': {
    keys: [K.VIEW_HOME],
    operator: 'OR',
    description: 'Acesso à página inicial da tool',
  },
  'route:dashboard': {
    keys: [K.VIEW_DASHBOARD],
    operator: 'OR',
    description: 'Acesso ao dashboard de métricas',
  },
  'route:settings': {
    keys: [K.VIEW_SETTINGS, K.ADMIN_CONFIG],
    operator: 'OR',
    description: 'Acesso às configurações (view:settings OU admin:config)',
  },
  'route:details': {
    keys: [K.VIEW_DETAILS],
    operator: 'OR',
    description: 'Acesso às páginas de detalhe de um item',
  },

  //
  // Ações — Capacidades funcionais
  //
  'action:create': {
    keys: [K.ACTION_CREATE],
    operator: 'OR',
    description: 'Criar novos itens',
  },
  'action:edit': {
    keys: [K.ACTION_EDIT],
    operator: 'OR',
    description: 'Editar itens existentes',
  },
  'action:delete': {
    keys: [K.ACTION_DELETE, K.ADMIN_MANAGE_USERS],
    operator: 'AND',
    description: 'Deletar requer action:delete E admin:manage-users (ação sensível)',
  },
  'action:export': {
    keys: [K.ACTION_EXPORT],
    operator: 'OR',
    description: 'Exportar dados da tool',
  },
  'action:import': {
    keys: [K.ACTION_IMPORT],
    operator: 'OR',
    description: 'Importar dados na tool',
  },
  'action:admin:config': {
    keys: [K.ADMIN_CONFIG],
    operator: 'OR',
    description: 'Configurar parâmetros administrativos da tool',
  },
  'action:admin:manage-users': {
    keys: [K.ADMIN_MANAGE_USERS],
    operator: 'OR',
    description: 'Gerenciar permissões de usuários nesta tool',
  },
};

// ---------------------------------------------------------------------------
// Contrato compatível com @hub/tool-contract (ToolPermissionMap)
// ---------------------------------------------------------------------------

/**
 * Escopos estruturados da tool, compatíveis com ToolPermissionScope.
 * Fonte de verdade derivada de TAX_MAP_PERMISSION_KEYS.
 */
const TAX_MAP_SCOPES: ToolPermissionScope[] = [
  {
    scopeId: 'view',
    label: 'Visualização',
    actions: [
      { actionId: 'home',      label: 'Ver página inicial',   description: 'Permite acesso à página inicial da tool' },
      { actionId: 'dashboard', label: 'Ver dashboard',        description: 'Permite visualização do dashboard com métricas' },
      { actionId: 'settings',  label: 'Ver configurações',    description: 'Permite acesso à página de configurações' },
      { actionId: 'details',   label: 'Ver detalhes',         description: 'Permite visualização de páginas de detalhes' },
    ],
  },
  {
    scopeId: 'action',
    label: 'Ações',
    actions: [
      { actionId: 'create', label: 'Criar',     description: 'Permite criar novos itens' },
      { actionId: 'edit',   label: 'Editar',    description: 'Permite editar itens existentes' },
      { actionId: 'delete', label: 'Deletar',   description: 'Permite deletar itens (ação sensível)' },
      { actionId: 'export', label: 'Exportar',  description: 'Permite exportar dados' },
      { actionId: 'import', label: 'Importar',  description: 'Permite importar dados' },
    ],
  },
  {
    scopeId: 'admin',
    label: 'Administração',
    actions: [
      { actionId: 'config',        label: 'Configurar',         description: 'Permite configurar a tool' },
      { actionId: 'manage-users',  label: 'Gerenciar usuários', description: 'Permite gerenciar permissões de usuários na tool' },
    ],
  },
];

/**
 * Lista plana de todas as permission keys da tool (para validação e auditoria)
 */
const ALL_PERMISSIONS: PermissionKey[] = Object.values(K);

/**
 * TOOL_PERMISSION_MAP
 *
 * Contrato de permissões da tool tax-map, compatível com ToolPermissionMap
 * de @hub/tool-contract.
 *
 * Consumido por:
 * - AccessDecisionService (Hub): avalia se usuário tem permissão.
 * - NavigationService (Hub): filtra itens de menu e deep links.
 * - tool.contract.ts: agrega no contrato completo do plugin.
 */
export const TOOL_PERMISSION_MAP: ToolPermissionMap = {
  toolKey: 'tax-map' as ToolKey,
  version: '1.0.0',
  namespace: 'tax-map',

  // Mapeamento de rotas para requisitos de permissão
  routes: Object.fromEntries(
    Object.entries(TOOL_PERMISSION_RULE_MAP)
      .filter(([key]) => key.startsWith('route:'))
      .map(([key, rule]) => [
        key.replace('route:', '/'),
        {
          rule: {
            operator: rule.operator,
            permissions: rule.keys
          },
          description: rule.description
        }
      ])
  ),

  // Mapeamento de ações para regras de permissão
  actions: Object.fromEntries(
    Object.entries(TOOL_PERMISSION_RULE_MAP)
      .filter(([key]) => key.startsWith('action:'))
      .map(([key, rule]) => [
        key.replace('action:', '').replace('action:admin:', 'admin:'),
        {
          rule: {
            operator: rule.operator,
            permissions: rule.keys
          },
          description: rule.description
        }
      ])
  ),

  // Escopos estruturados para visualização no Hub
  scopes: TAX_MAP_SCOPES,

  // Lista plana de todas as permission keys (para auditoria e validação)
  allPermissions: ALL_PERMISSIONS,

  // Metadados do mapa de permissões (determinístico - sem valores runtime)
  metadata: {
    version: '1.0.0',
    lastUpdated: '2024-03-02T00:00:00Z',
    owner: 'tax-map-team',
    description: 'Permission map for Tax Map tool with declarative rules'
  }
};
