/**
 * Academy Tool - Permission Map
 *
 * Contrato declarativo de permissões da Tool Academy.
 *
 * Responsabilidades:
 * - Exportar TOOL_PERMISSION_RULE_MAP: mapeamento alvo → regra declarativa
 * - Exportar TOOL_PERMISSION_MAP: contrato compatível com @hub/tool-contract
 *
 * Regras de ouro:
 * - Zero lógica executável: apenas dados declarativos
 * - Zero chamadas HTTP ou injeção de dependências
 * - O Hub (não a tool) avalia as regras e decide o acesso
 * - Granularidade mínima suficiente
 *
 * Integração:
 * - Consumido por tool.contract.ts para montagem do contrato do plugin
 * - Referenciado por tool.routes.ts e tool.menu-metadata.ts via ACADEMY_PERMISSION_KEYS
 */

import type { ToolPermissionMap, ToolPermissionScope, ToolKey, PermissionKey } from '@hub/tool-contract';
import {
  ACADEMY_PERMISSION_KEYS as K,
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
 * - "route:*"  → controla entrada/visualização (guards de rota no Hub)
 * - "action:*" → controla capacidades funcionais (botões, dialogs, exports)
 *
 * Operadores:
 * - OR  → qualquer chave listada autoriza o acesso (padrão mais comum)
 * - AND → todas as chaves são obrigatórias (use para ações sensíveis)
 */
export const TOOL_PERMISSION_RULE_MAP: ToolPermissionRuleMap = {
  //
  // Rotas — Visualização
  //
  'route:overview': {
    keys: [K.VIEW_OVERVIEW],
    operator: 'OR',
    description: 'Acesso à página overview da Academy',
  },
  'route:trilhas': {
    keys: [K.VIEW_TRILHAS],
    operator: 'OR',
    description: 'Acesso à página de trilhas de aprendizado',
  },
  'route:conteudos': {
    keys: [K.VIEW_CONTEUDOS],
    operator: 'OR',
    description: 'Acesso à página de conteúdos',
  },
  'route:ai-criar': {
    keys: [K.VIEW_AI_CRIAR],
    operator: 'OR',
    description: 'Acesso à página de criação com IA',
  },
  'route:avaliacoes': {
    keys: [K.VIEW_AVALIACOES],
    operator: 'OR',
    description: 'Acesso à página de avaliações',
  },
  'route:biblioteca': {
    keys: [K.VIEW_BIBLIOTECA],
    operator: 'OR',
    description: 'Acesso à biblioteca de recursos',
  },
  'route:item': {
    keys: [K.VIEW_ITEM],
    operator: 'OR',
    description: 'Acesso à visualização de item individual',
  },

  //
  // Ações — Capacidades
  //
  'action:create-content': {
    keys: [K.ACTION_CREATE_CONTENT],
    operator: 'OR',
    description: 'Permissão para criar novo conteúdo',
  },
  'action:edit-content': {
    keys: [K.ACTION_EDIT_CONTENT],
    operator: 'OR',
    description: 'Permissão para editar conteúdo existente',
  },
  'action:delete-content': {
    keys: [K.ACTION_DELETE_CONTENT],
    operator: 'OR',
    description: 'Permissão para excluir conteúdo',
  },
  'action:manage-trilhas': {
    keys: [K.ACTION_MANAGE_TRILHAS],
    operator: 'OR',
    description: 'Permissão para gerenciar trilhas de aprendizado',
  },
  'action:manage-avaliacoes': {
    keys: [K.ACTION_MANAGE_AVALIACOES],
    operator: 'OR',
    description: 'Permissão para gerenciar avaliações',
  },
  'action:ai-generate': {
    keys: [K.ACTION_AI_GENERATE],
    operator: 'OR',
    description: 'Permissão para usar geração com IA',
  },
};

// ---------------------------------------------------------------------------
// Contrato compatível com @hub/tool-contract (ToolPermissionMap)
// ---------------------------------------------------------------------------

/**
 * Escopos estruturados da tool, compatíveis com ToolPermissionScope.
 * Fonte de verdade derivada de ACADEMY_PERMISSION_KEYS.
 */
const ACADEMY_SCOPES: ToolPermissionScope[] = [
  {
    scopeId: 'view',
    label: 'Visualização',
    actions: [
      { actionId: 'overview', label: 'Ver visão geral', description: 'Permite acesso à página overview' },
      { actionId: 'trilhas', label: 'Ver trilhas', description: 'Permite visualização de trilhas' },
      { actionId: 'conteudos', label: 'Ver conteúdos', description: 'Permite acesso ao catálogo de conteúdos' },
      { actionId: 'ai-criar', label: 'Ver criação com IA', description: 'Permite acesso à ferramenta de criação com IA' },
      { actionId: 'avaliacoes', label: 'Ver avaliações', description: 'Permite acesso às avaliações' },
      { actionId: 'biblioteca', label: 'Ver biblioteca', description: 'Permite acesso à biblioteca' },
      { actionId: 'item', label: 'Ver item', description: 'Permite visualização de itens individuais' },
    ],
  },
  {
    scopeId: 'action',
    label: 'Ações',
    actions: [
      { actionId: 'create-content', label: 'Criar conteúdo', description: 'Permite criar novo conteúdo' },
      { actionId: 'edit-content', label: 'Editar conteúdo', description: 'Permite editar conteúdo existente' },
      { actionId: 'delete-content', label: 'Excluir conteúdo', description: 'Permite excluir conteúdo' },
      { actionId: 'manage-trilhas', label: 'Gerenciar trilhas', description: 'Permite gerenciar trilhas de aprendizado' },
      { actionId: 'manage-avaliacoes', label: 'Gerenciar avaliações', description: 'Permite gerenciar avaliações' },
      { actionId: 'ai-generate', label: 'Gerar com IA', description: 'Permite usar geração com IA' },
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
 * Contrato de permissões da tool academy, compatível com ToolPermissionMap
 * de @hub/tool-contract.
 *
 * Consumido por:
 * - AccessDecisionService (Hub): avalia se usuário tem permissão
 * - NavigationService (Hub): filtra itens de menu e deep links
 * - tool.contract.ts: agrega no contrato completo do plugin
 */
export const TOOL_PERMISSION_MAP: ToolPermissionMap = {
  toolKey: 'academy' as ToolKey,
  version: '1.0.0',
  namespace: 'academy',

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
        key.replace('action:', ''),
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
  scopes: ACADEMY_SCOPES,

  // Lista plana de todas as permission keys (para auditoria e validação)
  allPermissions: ALL_PERMISSIONS,

  // Metadados do mapa de permissões
  metadata: {
    version: '1.0.0',
    lastUpdated: '2024-03-11T00:00:00Z',
    owner: 'academy-team',
    description: 'Permission map for Academy tool with declarative rules'
  }
};
