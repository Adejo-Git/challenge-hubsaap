/**
 * ToolFeatureFlags: Contrato declarativo de feature flags
 * 
 * Define as capacidades (capabilities) e requisitos mínimos da tool
 * para habilitar rotas e features.
 * 
 * Propósito:
 * - Permitir controle de rollout pelo Hub sem acoplamento de código
 * - Declarar quais features/rotas podem ser habilitadas/desabilitadas
 * - Oferecer metadados para filtragem de deep links e menu
 * 
 * Separação de responsabilidades:
 * - Feature Flags: habilitação (on/off) de capacidades
 * - Permissions (ToolPermissionMap): autorização (quem pode fazer o quê)
 * 
 * Regras:
 * - Chaves devem ser namespaceadas com o toolKey: "tax-map.feature" (formato padrão do Hub)
 * - Sem IO ou HttpClient (contrato puramente declarativo)
 * - Sem lógica de autorização (isso é RBAC/ABAC no Access Layer)
 * - Chaves estáveis e versionáveis (não mudar em produção sem migração)
 */

import { ToolFeatureFlagsMap } from './tool.feature-flags.model';

/**
 * ToolKey para namespace das features
 */
const TOOL_KEY = 'tax-map';

/**
 * Helper para criar chave namespaceada
 * Formato padrão do Hub: "toolKey:featureKey" (dois-pontos, preferido pelo contrato de testes)
 */
const featureKey = (key: string): string => `${TOOL_KEY}:${key}`;

/**
 * Mapa declarativo de feature flags da tool
 * 
 * Cada feature representa uma capacidade controlável pelo Hub.
 * O Access Layer do Hub avalia estas flags em conjunto com
 * permissões e contexto para decidir visibilidade/disponibilidade.
 */
export const TOOL_FEATURE_FLAGS: ToolFeatureFlagsMap = {
  
  // -------------------------------------------------------------------
  // FEATURES CORE (essenciais para funcionamento básico)
  // -------------------------------------------------------------------
  
  [featureKey('home')]: {
    key: featureKey('home'),
    title: 'Página Inicial',
    description: 'Dashboard principal da tool com visão geral e acesso rápido',
    defaultState: {
      prod: 'enabled',
      hml: 'enabled',
      dev: 'enabled',
      default: 'enabled',
    },
    category: 'core',
    createdAt: '2026-02-23',
    minVersion: '1.0.0',
  },

  [featureKey('about')]: {
    key: featureKey('about'),
    title: 'Sobre',
    description: 'Informações da tool, versão e documentação',
    defaultState: {
      prod: 'enabled',
      hml: 'enabled',
      dev: 'enabled',
      default: 'enabled',
    },
    category: 'core',
    createdAt: '2026-02-23',
    minVersion: '1.0.0',
  },

  // -------------------------------------------------------------------
  // FEATURES AVANÇADAS (funcionalidades adicionais)
  // -------------------------------------------------------------------
  
  [featureKey('reports')]: {
    key: featureKey('reports'),
    title: 'Relatórios',
    description: 'Módulo de geração e visualização de relatórios',
    defaultState: {
      prod: 'enabled',
      hml: 'enabled',
      dev: 'enabled',
      default: 'enabled',
    },
    rules: {
      requireProject: true, // Relatórios exigem contexto de projeto ativo
    },
    category: 'advanced',
    createdAt: '2026-02-23',
    minVersion: '1.0.0',
  },

  [featureKey('analytics')]: {
    key: featureKey('analytics'),
    title: 'Analytics',
    description: 'Visualização de métricas e análise de dados',
    defaultState: {
      prod: 'enabled',
      hml: 'enabled',
      dev: 'enabled',
      default: 'disabled',
    },
    rules: {
      requireProject: true,
      requireTenantTier: 'premium', // Analytics apenas para planos premium+
    },
    category: 'advanced',
    createdAt: '2026-02-23',
    minVersion: '1.1.0',
  },

  // -------------------------------------------------------------------
  // FEATURES ADMINISTRATIVAS (configuração e gestão)
  // -------------------------------------------------------------------
  
  [featureKey('settings')]: {
    key: featureKey('settings'),
    title: 'Configurações',
    description: 'Gerenciamento de configurações da tool',
    defaultState: {
      prod: 'enabled',
      hml: 'enabled',
      dev: 'enabled',
      default: 'enabled',
    },
    category: 'admin',
    createdAt: '2026-02-23',
    minVersion: '1.0.0',
  },

  [featureKey('admin')]: {
    key: featureKey('admin'),
    title: 'Administração',
    description: 'Painel administrativo com gestão avançada da tool',
    defaultState: {
      prod: 'enabled',
      hml: 'enabled',
      dev: 'enabled',
      default: 'disabled',
    },
    rules: {
      requireTenantTier: 'enterprise', // Admin apenas para enterprise
    },
    category: 'admin',
    createdAt: '2026-02-23',
    minVersion: '1.0.0',
  },

  // -------------------------------------------------------------------
  // FEATURES EXPERIMENTAIS (em desenvolvimento/beta)
  // -------------------------------------------------------------------
  
  [featureKey('ai-assistant')]: {
    key: featureKey('ai-assistant'),
    title: 'Assistente IA',
    description: 'Assistente inteligente para auxiliar nas operações da tool',
    defaultState: {
      prod: 'disabled',
      hml: 'beta',
      dev: 'beta',
      default: 'disabled',
    },
    rules: {
      experimental: true,
      requireProject: true,
    },
    category: 'experimental',
    createdAt: '2026-02-23',
    minVersion: '2.0.0',
  },

  [featureKey('batch-operations')]: {
    key: featureKey('batch-operations'),
    title: 'Operações em Lote',
    description: 'Executar ações em múltiplos itens simultaneamente',
    defaultState: {
      prod: 'disabled',
      hml: 'beta',
      dev: 'enabled',
      default: 'disabled',
    },
    rules: {
      experimental: true,
      requireProject: true,
    },
    category: 'experimental',
    createdAt: '2026-02-23',
    minVersion: '1.2.0',
  },
};

/**
 * Helper para obter todas as chaves de features
 */
export function getFeatureKeys(): string[] {
  return Object.keys(TOOL_FEATURE_FLAGS);
}

/**
 * Helper para obter feature por chave
 */
export function getFeature(key: string) {
  return TOOL_FEATURE_FLAGS[key];
}

/**
 * Helper para obter features por categoria
 */
export function getFeaturesByCategory(category: string) {
  return Object.values(TOOL_FEATURE_FLAGS).filter(
    (feature) => feature.category === category
  );
}
