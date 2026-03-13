/**
 * Academy Tool - Feature Flags
 *
 * Declaração de feature flags da Tool Academy.
 *
 * Responsabilidades:
 * - Exportar TOOL_FEATURE_FLAGS: contrato compatível com @hub/tool-contract
 * - Manter flags namespaceadas e versionáveis
 *
 * Regras:
 * - Zero lógica executável
 * - Namespace obrigatório: 'academy:*'
 * - O Hub avalia flags via FeatureFlagService
 */

import type { ToolKey } from '@hub/tool-contract';
import { ACADEMY_FEATURE_KEYS as F } from './tool.feature-flags.model';

/**
 * TOOL_FEATURE_FLAGS
 *
 * Contrato de feature flags exportável para o Hub.
 *
 * Estrutura:
 * - toolKey: identificador único
 * - flags: array de feature flags com metadados
 */
export const TOOL_FEATURE_FLAGS = {
  toolKey: 'academy' as ToolKey,

  flags: [
    {
      key: F.OVERVIEW,
      name: 'Academy Overview',
      description: 'Página de visão geral da Academy',
      defaultEnabled: true,
    },
    {
      key: F.TRILHAS,
      name: 'Trilhas de Aprendizado',
      description: 'Funcionalidade de trilhas de aprendizado',
      defaultEnabled: true,
    },
    {
      key: F.CONTEUDOS,
      name: 'Catálogo de Conteúdos',
      description: 'Navegação e busca de conteúdos',
      defaultEnabled: true,
    },
    {
      key: F.AI_CRIAR,
      name: 'Criação com IA',
      description: 'Ferramentas de criação de conteúdo com IA',
      defaultEnabled: false, // Beta feature
    },
    {
      key: F.AVALIACOES,
      name: 'Sistema de Avaliações',
      description: 'Criação e gestão de avaliações',
      defaultEnabled: true,
    },
    {
      key: F.BIBLIOTECA,
      name: 'Biblioteca de Recursos',
      description: 'Repositório de recursos de aprendizado',
      defaultEnabled: true,
    },
    {
      key: F.ITEM,
      name: 'Visualização de Item',
      description: 'Página de detalhes de item individual',
      defaultEnabled: true,
    },
    {
      key: F.CONTENT_CREATION,
      name: 'Criação de Conteúdo',
      description: 'Capacidade de criar novos conteúdos',
      defaultEnabled: true,
    },
    {
      key: F.AI_GENERATION,
      name: 'Geração com IA',
      description: 'Geração automática de conteúdo via IA',
      defaultEnabled: false, // Experimental
    },
    {
      key: F.TRILHA_MANAGEMENT,
      name: 'Gestão de Trilhas',
      description: 'Ferramentas de gestão de trilhas',
      defaultEnabled: true,
    },
    {
      key: F.ASSESSMENT_ENGINE,
      name: 'Motor de Avaliações',
      description: 'Sistema de criação e correção de avaliações',
      defaultEnabled: true,
    },
    {
      key: F.BIBLIOTECA_SEARCH,
      name: 'Busca na Biblioteca',
      description: 'Funcionalidade de busca avançada na biblioteca',
      defaultEnabled: true,
    },
  ],
};

