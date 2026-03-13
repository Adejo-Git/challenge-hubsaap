/**
 * Academy Tool - Feature Flags Model
 *
 * Tipagem de feature flags da Tool Academy.
 *
 * Responsabilidades:
 * - Definir ACADEMY_FEATURE_KEYS namespaceadas com 'academy:'
 * - Fornecer tipo AcademyFeatureKey derivado
 * - Manter catálogo tipado e versionável
 *
 * Não-responsabilidades:
 * - Não implementa avaliação de flags (responsabilidade do FeatureFlagService)
 * - Não faz IO ou injeção de dependências
 */

import type { FeatureKey } from '@hub/tool-contract';

/**
 * Catálogo de feature keys da tool academy.
 *
 * Convenção de namespace: `academy:{featureName}`
 *
 * Uso:
 *   import { ACADEMY_FEATURE_KEYS as F } from './tool.feature-flags.model';
 *   someRoute.data.requiredFeatures = [F.OVERVIEW];
 *
 * Regra: namespaceamento obrigatório para evitar colisões com outras tools.
 */
export const ACADEMY_FEATURE_KEYS = {
  // Features de páginas
  OVERVIEW: 'academy:overview' as FeatureKey,
  TRILHAS: 'academy:trilhas' as FeatureKey,
  CONTEUDOS: 'academy:conteudos' as FeatureKey,
  AI_CRIAR: 'academy:ai-criar' as FeatureKey,
  AVALIACOES: 'academy:avaliacoes' as FeatureKey,
  BIBLIOTECA: 'academy:biblioteca' as FeatureKey,
  ITEM: 'academy:item' as FeatureKey,

  // Features de capacidades
  CONTENT_CREATION: 'academy:content-creation' as FeatureKey,
  AI_GENERATION: 'academy:ai-generation' as FeatureKey,
  TRILHA_MANAGEMENT: 'academy:trilha-management' as FeatureKey,
  ASSESSMENT_ENGINE: 'academy:assessment-engine' as FeatureKey,
  BIBLIOTECA_SEARCH: 'academy:biblioteca-search' as FeatureKey,
} as const;

/**
 * Tipo derivado das feature keys da Academy
 */
export type AcademyFeatureKey = (typeof ACADEMY_FEATURE_KEYS)[keyof typeof ACADEMY_FEATURE_KEYS];

