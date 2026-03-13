/**
 * @file access-decision.requirements.ts
 * @description Extração de requirements de route.data, tool metadata e action maps.
 * 
 * GUARDRAILS:
 * - Não fazer HTTP para buscar metadados (assumir recebidos por DI/config)
 * - Validar formato de requirements (evitar undefined/null cascade)
 * - Normalizar keys (lowercase, trim)
 * 
 * Responsabilidades:
 * - Extrair requirements de Angular Route.data
 * - Extrair requirements de tool metadata (ToolContract)
 * - Extrair requirements de action maps
 * - Merge/normalize requirements de múltiplas fontes
 */

import { Route } from '@angular/router';
import { Requirements } from './access-decision.model';

/**
 * Interface mínima esperada de tool metadata (do ToolContract).
 * 
 * Evita dependência direta da lib tool-contract; AccessDecision
 * usa apenas o que precisa.
 */
export interface ToolMetadataLite {
  /**
   * Tool key único.
   */
  key: string;

  /**
   * Feature flag key para habilitar/desabilitar a tool.
   */
  featureFlagKey?: string;

  /**
   * Permissões requeridas para acessar a tool.
   */
  permissions?: {
    key?: string;
    keys?: string[];
    any?: boolean;
  };

  /**
   * Contexto obrigatório.
   */
  requireContext?: boolean;
}

/**
 * Extrai requirements de Route.data.
 * 
 * Convenção:
 * - data.toolKey: chave da tool
 * - data.featureFlagKey: flag a ser checada
 * - data.permissionKey: permissão única obrigatória
 * - data.permissionKeys: múltiplas permissões {keys, any}
 * - data.policyKey: policy ABAC
 * - data.requireContext: contexto obrigatório
 * - data.requireAuth: autenticação obrigatória (padrão: true)
 * 
 * @param route - Angular Route
 * @returns Requirements extraídos ou null se não definidos
 */
export function extractRequirementsFromRoute(route: Route): Requirements | null {
  if (!route || !route.data) {
    return null;
  }

  const data = route.data;
  const reqs: Requirements = {};

  if (data['toolKey']) {
    reqs.toolKey = normalizeKey(data['toolKey']);
  }

  if (data['featureFlagKey']) {
    reqs.featureFlagKey = normalizeKey(data['featureFlagKey']);
  }

  if (data['permissionKey']) {
    reqs.permissionKey = normalizeKey(data['permissionKey']);
  }

  if (data['permissionKeys']) {
    const permKeys = data['permissionKeys'];
    if (Array.isArray(permKeys)) {
      reqs.permissionKeys = {
        keys: permKeys.map(normalizeKey),
        any: false,
      };
    } else if (permKeys.keys && Array.isArray(permKeys.keys)) {
      reqs.permissionKeys = {
        keys: permKeys.keys.map(normalizeKey),
        any: permKeys.any ?? false,
      };
    }
  }

  if (data['policyKey']) {
    reqs.policyKey = normalizeKey(data['policyKey']);
  }

  if (typeof data['requireContext'] === 'boolean') {
    reqs.requireContext = data['requireContext'];
  }

  if (typeof data['requireAuth'] === 'boolean') {
    reqs.requireAuth = data['requireAuth'];
  } else {
    // Padrão: autenticação obrigatória
    reqs.requireAuth = true;
  }

  return Object.keys(reqs).length > 0 ? reqs : null;
}

/**
 * Extrai requirements de tool metadata (ToolContract).
 * 
 * @param metadata - Tool metadata lite
 * @returns Requirements extraídos ou null se não definidos
 */
export function extractRequirementsFromToolMetadata(
  metadata: ToolMetadataLite | null
): Requirements | null {
  if (!metadata) {
    return null;
  }

  const reqs: Requirements = {
    toolKey: normalizeKey(metadata.key),
  };

  if (metadata.featureFlagKey) {
    reqs.featureFlagKey = normalizeKey(metadata.featureFlagKey);
  }

  if (metadata.permissions) {
    if (metadata.permissions.key) {
      reqs.permissionKey = normalizeKey(metadata.permissions.key);
    }

    if (metadata.permissions.keys && metadata.permissions.keys.length > 0) {
      reqs.permissionKeys = {
        keys: metadata.permissions.keys.map(normalizeKey),
        any: metadata.permissions.any ?? false,
      };
    }
  }

  if (typeof metadata.requireContext === 'boolean') {
    reqs.requireContext = metadata.requireContext;
  }

  return reqs;
}

/**
 * Merge múltiplos requirements (route > tool > defaults).
 * 
 * Prioridade: route data sobrescreve tool metadata.
 * 
 * @param sources - Array de Requirements (prioridade decrescente)
 * @returns Requirements merged
 */
export function mergeRequirements(...sources: (Requirements | null)[]): Requirements {
  const result: Requirements = {};

  for (const src of sources.reverse()) {
    if (!src) continue;

    if (src.toolKey) result.toolKey = src.toolKey;
    if (src.featureFlagKey) result.featureFlagKey = src.featureFlagKey;
    if (src.permissionKey) result.permissionKey = src.permissionKey;
    if (src.permissionKeys) result.permissionKeys = src.permissionKeys;
    if (src.policyKey) result.policyKey = src.policyKey;
    if (typeof src.requireContext === 'boolean') result.requireContext = src.requireContext;
    if (typeof src.requireAuth === 'boolean') result.requireAuth = src.requireAuth;
  }

  // Padrão: autenticação obrigatória
  if (result.requireAuth === undefined) {
    result.requireAuth = true;
  }

  return result;
}

/**
 * Valida se Requirements contém pelo menos uma condição.
 */
export function isValidRequirements(reqs: Requirements | null): boolean {
  if (!reqs) return false;

  return !!(
    reqs.toolKey ||
    reqs.featureFlagKey ||
    reqs.permissionKey ||
    (reqs.permissionKeys && reqs.permissionKeys.keys.length > 0) ||
    reqs.policyKey ||
    reqs.requireContext
  );
}

/**
 * Normaliza uma key (lowercase, trim).
 */
function normalizeKey(key: string): string {
  if (!key || typeof key !== 'string') return '';
  return key.trim().toLowerCase();
}

/**
 * Cria Requirements padrão para uma tool.
 * 
 * Útil quando não há route.data mas sabemos a toolKey.
 */
export function createDefaultToolRequirements(toolKey: string): Requirements {
  return {
    toolKey: normalizeKey(toolKey),
    requireAuth: true,
  };
}
