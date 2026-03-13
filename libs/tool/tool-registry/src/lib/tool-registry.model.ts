/**
 * tool-registry.model.ts
 *
 * Tipos de domínio do ToolRegistry.
 * Define o contrato de dados entre o Registry e seus consumidores (Shell, NavigationService, Guards).
 *
 * Princípios:
 * - Referenciam apenas abstrações do tool-contract (sem implementações de tools).
 * - Sem IO (somente types e interfaces).
 * - Campos obrigatórios mínimos + campos opcionais para evolução futura.
 */

import {
  ToolKey,
  ToolMenuMetadata,
  ToolFeatureFlags,
  ToolPermissionMap,
} from '@hub/tool-contract';

/**
 * Versão do contrato da tool.
 * Formato semver: "major.minor.patch" (ex: "1.0.0").
 * Usado para detectar drift entre build e runtime.
 */
export type ToolContractVersion = string;

/**
 * Grupo de agrupamento da tool no menu.
 * Exemplos: 'financeiro', 'rh', 'admin', 'operacional'.
 */
export type ToolGroup = string;

/**
 * Descritor completo de uma tool registrada no Hub.
 * É a "ficha" da tool no catálogo em runtime.
 *
 * Campos obrigatórios garantem que a tool pode ser renderizada no menu,
 * ter sua rota validada por Guards e ser habilitada/desabilitada por flags.
 */
export interface ToolDescriptor {
  /** Identificador único e estável da tool (kebab-case). Ex: 'financeiro', 'audit-trail'. */
  toolKey: ToolKey;

  /** Nome legível para exibição no menu e breadcrumbs. */
  label: string;

  /**
   * Grupo de agrupamento no menu principal.
   * Tools do mesmo grupo aparecem juntas.
   */
  group: ToolGroup;

  /**
   * Ordem de exibição dentro do grupo (menor = mais acima).
   * Default implícito: 99 (final do grupo).
   */
  order: number;

  /**
   * Path de entrada da tool no roteador Angular.
   * Formato: '/tools/<toolKey>' ou path customizado.
   * Usado pelo Router para lazy loading e pelos Guards para validação.
   */
  entryPath: string;

  /**
   * Metadata de menu exportada pela tool.
   * Contém displayName, ícone, menuItems, deepLinks e categoria.
   */
  metadata: ToolMenuMetadata;

  /**
   * Feature flags declaradas pela tool, com valores default.
   * O Registry usa isso para filtrar tools desabilitadas por contexto.
   */
  flags: ToolFeatureFlags;

  /**
   * Mapa de permissões (escopos e ações) declarados pela tool.
   * Usado pelo Access Layer para RBAC/ABAC — não autoriza aqui.
   */
  permissionMap: ToolPermissionMap;

  /**
   * Versão do contrato da tool.
   * Permite detectar incompatibilidade entre a versão esperada pelo Hub e a exportada pela tool.
   */
  version: ToolContractVersion;

  /**
   * Flag de habilitação da tool no cliente atual (OnPrem/SaaS).
   * Definida pelo RuntimeConfig: false = tool instalada mas desativada para este cliente.
   * Default: true (habilitada por padrão se não especificada).
   */
  enabled?: boolean;
}

/**
 * Catálogo de tools em runtime.
 * Mapa indexado por toolKey para lookup O(1).
 */
export type ToolCatalog = Map<ToolKey, ToolDescriptor>;

/**
 * Nó de menu derivado do catálogo após filtros de flags e decisão.
 * É o formato seguro consumido pelo NavigationService e pelo Shell para renderizar menus.
 *
 * IMPORTANTE: MenuNode não contém lógica de autorização — é apenas dados derivados.
 */
export interface MenuNode {
  /** Key da tool de origem. */
  toolKey: ToolKey;

  /** Nome legível para renderização. */
  label: string;

  /** Ícone principal (nome do design system). */
  icon?: string;

  /** Path de entrada para navegação Angular Router. */
  path: string;

  /** Ordem de exibição (menor = mais acima). */
  order: number;

  /** Grupo de agrupamento. */
  group: ToolGroup;

  /**
   * Sub-nós de menu (itens internos da tool).
   * Derivados de ToolMenuMetadata.menuItems.
   */
  children?: MenuNode[];

  /** Badge opcional (ex: 'NEW', 'BETA'). */
  badge?: string;

  /** Indica se a tool está em modo beta/experimental. */
  isBeta?: boolean;
}

/**
 * Resultado de lookup de uma tool.
 * Padrão discriminado: encontrada (found) ou não (notFound).
 */
export type ToolLookupResult =
  | { found: true; descriptor: ToolDescriptor }
  | { found: false; toolKey: ToolKey; reason: 'notFound' | 'disabled' };

/**
 * Configuração de runtime fornecida externamente (ex: instalação OnPrem).
 * Lista as tools habilitadas/desabilitadas no cliente e permite sobrescrever ordem/grupo.
 */
export interface ToolRuntimeConfig {
  /**
   * Tools explicitamente habilitadas neste cliente.
   * Se definido, apenas tools desta lista serão carregadas.
   * Se undefined, todas as tools exportadas no build são habilitadas.
   */
  enabledTools?: ToolKey[];

  /**
   * Sobrescritas de ordem/grupo por toolKey.
   * Permite customização de layout de menu por instalação.
   */
  overrides?: Partial<Record<ToolKey, Pick<ToolDescriptor, 'group' | 'order'>>>;
}
