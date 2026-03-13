// Re-export branded key helpers for test and consumer use
export { createToolKey, createPermissionKey, createFeatureKey } from '../models/menu/tool-menu-metadata';
/**
 * Tool Contract Validation
 * 
 * Helpers leves para validar consistência do contrato Tool↔Hub.
 * Validações são opcionais (não bloqueiam runtime), úteis em dev/test.
 * 
 * Responsabilidades:
 * - Validar keys namespaceadas (formato correto)
 * - Verificar unicidade de IDs (menu items, deep links)
 * - Validar coerência de deep links (paths relativos)
 * - Detectar referências inconsistentes (permissions/features inexistentes)
 * 
 * Não-responsabilidades:
 * - Não fazer IO (sem HttpClient)
 * - Não acessar runtime config
 * - Não lançar exceções (retornar ValidationResult)
 */

import {
  ToolContract,
  ToolKey,
  PermissionKey,
  FeatureKey,
  ToolMenuItem,
  ToolDeepLink,
  ToolContractValidationResult,
  ToolPermissionScope,
} from '../models/tool-contract.model';

/**
 * Valida formato do ToolKey
 * Recomendado: kebab-case, lowercase, sem espaços
 */
export function validateToolKey(toolKey: ToolKey | string): ToolContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const toolKeyStr = toolKey as string;

  if (!toolKeyStr || toolKeyStr.trim().length === 0) {
    errors.push('ToolKey não pode ser vazio');
  }

  if (toolKeyStr !== toolKeyStr.toLowerCase()) {
    warnings.push('ToolKey deveria ser lowercase');
  }

  if (!/^[a-z0-9-]+$/.test(toolKeyStr)) {
    errors.push('ToolKey deve conter apenas letras minúsculas, números e hífens');
  }

  if (toolKeyStr.startsWith('-') || toolKeyStr.endsWith('-')) {
    errors.push('ToolKey não pode começar ou terminar com hífen');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida formato de PermissionKey
 * Formato esperado: ${toolKey}..
 */
export function validatePermissionKey(
  permissionKey: PermissionKey | string,
  toolKey: ToolKey | string
): ToolContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const permKeyStr = permissionKey as string;
  const toolKeyStr = toolKey as string;

  if (!permKeyStr || permKeyStr.trim().length === 0) {
    errors.push('PermissionKey não pode ser vazio');
  }

  const parts = permKeyStr.split('.');
  
  if (parts.length < 3) {
    errors.push('PermissionKey deve ter formato: <toolKey>.<scope>.<action>');
  }

  if (parts[0] !== toolKeyStr) {
    errors.push(`PermissionKey deve começar com toolKey: ${toolKeyStr}`);
  }

  if (parts.some(part => !part || part.trim().length === 0)) {
    errors.push('PermissionKey não pode ter partes vazias');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida formato de FeatureKey
 * Formato esperado: ${toolKey}.
 */
export function validateFeatureKey(
  featureKey: FeatureKey | string,
  toolKey: ToolKey | string
): ToolContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const featKeyStr = featureKey as string;
  const toolKeyStr = toolKey as string;

  if (!featKeyStr || featKeyStr.trim().length === 0) {
    errors.push('FeatureKey não pode ser vazio');
  }

  const parts = featKeyStr.split('.');
  
  if (parts.length < 2) {
    errors.push('FeatureKey deve ter formato: <toolKey>.<featureName>');
  }

  if (parts[0] !== toolKeyStr) {
    errors.push(`FeatureKey deve começar com toolKey: ${toolKeyStr}`);
  }

  if (parts.some(part => !part || part.trim().length === 0)) {
    errors.push('FeatureKey não pode ter partes vazias');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida referências de permissões em um deep link
 */
function validateDeepLinkPermissions(
  deepLinkId: string,
  requiredPermissions: PermissionKey[] | undefined,
  declaredPermissions: Set<PermissionKey> | Set<string>
): string[] {
  const warnings: string[] = [];
  
  if (!requiredPermissions) {
    return warnings;
  }

  for (const permKey of requiredPermissions) {
    const declared = Array.from(declaredPermissions).map(String);
    if (!declared.includes(String(permKey))) {
      warnings.push(`DeepLink ${deepLinkId} referencia permissão não declarada: ${permKey}`);
    }
  }

  return warnings;
}

/**
 * Valida referências de features em um deep link
 */
function validateDeepLinkFeatures(
  deepLinkId: string,
  requiredFeatures: FeatureKey[] | undefined,
  declaredFeatures: Set<FeatureKey> | Set<string>
): string[] {
  const warnings: string[] = [];
  
  if (!requiredFeatures) {
    return warnings;
  }

  for (const featKey of requiredFeatures) {
    const declaredF = Array.from(declaredFeatures).map(String);
    if (!declaredF.includes(String(featKey))) {
      warnings.push(`DeepLink ${deepLinkId} referencia feature não declarada: ${featKey}`);
    }
  }

  return warnings;
}

/**
 * Valida deep link
 * - Path deve ser relativo (não começar com /)
 * - ID deve ser único
 * - Permissions/features devem existir no contrato
 */
export function validateDeepLink(
  deepLink: ToolDeepLink,
  toolKey: ToolKey | string,
  declaredPermissions: Set<PermissionKey> | Set<string>,
  declaredFeatures: Set<FeatureKey> | Set<string>
): ToolContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!deepLink.id || deepLink.id.trim().length === 0) {
    errors.push('DeepLink deve ter ID único');
  }

  if (!deepLink.path || deepLink.path.trim().length === 0) {
    errors.push('DeepLink deve ter path');
  }

  if (deepLink.path.startsWith('/')) {
    errors.push(`DeepLink path deve ser relativo (não começar com /): ${deepLink.path}`);
  }

  if (deepLink.path.includes('//')) {
    errors.push(`DeepLink path contém barras duplas: ${deepLink.path}`);
  }

  // Validar permissions referenciadas
  const permWarnings = validateDeepLinkPermissions(
    deepLink.id,
    deepLink.requiredPermissions,
    declaredPermissions
  );
  warnings.push(...permWarnings);

  // Validar features referenciadas
  const featWarnings = validateDeepLinkFeatures(
    deepLink.id,
    deepLink.requiredFeatures,
    declaredFeatures
  );
  warnings.push(...featWarnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida unicidade de IDs em menu items (recursivo)
 */
function collectMenuItemIds(items: ToolMenuItem[], ids: Set<string>): string[] {
  const duplicates: string[] = [];

  for (const item of items) {
    if (ids.has(item.id)) {
      duplicates.push(item.id);
    } else {
      ids.add(item.id);
    }

    if (item.children && item.children.length > 0) {
      const childDuplicates = collectMenuItemIds(item.children, ids);
      duplicates.push(...childDuplicates);
    }
  }

  return duplicates;
}

/**
 * Valida menu metadata
 */
export function validateMenuMetadata(
  contract: ToolContract
): ToolContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const menu = contract.menu;

  if (!menu.displayName || menu.displayName.trim().length === 0) {
    errors.push('Menu deve ter displayName');
  }

  if (!menu.menuItems || menu.menuItems.length === 0) {
    warnings.push('Menu não tem items (tool sem navegação?)');
  }

  // Validar unicidade de IDs
  const menuIds = new Set<string>();
  const duplicateIds = collectMenuItemIds(menu.menuItems, menuIds);

  if (duplicateIds.length > 0) {
    errors.push(`IDs de menu duplicados: ${duplicateIds.join(', ')}`);
  }

  // Validar deep links
  if (menu.deepLinks) {
    const deepLinkIds = new Set<string>();
    const declaredPermissions = new Set(contract.permissions?.allPermissions || []);
    const declaredFeatures = new Set(Object.keys(contract.featureFlags.features));

    for (const deepLink of menu.deepLinks) {
      if (deepLinkIds.has(deepLink.id)) {
        errors.push(`DeepLink ID duplicado: ${deepLink.id}`);
      } else {
        deepLinkIds.add(deepLink.id);
      }

      const deepLinkValidation = validateDeepLink(
        deepLink,
        contract.toolKey,
        declaredPermissions,
        declaredFeatures
      );

      errors.push(...deepLinkValidation.errors);
      warnings.push(...deepLinkValidation.warnings);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida contrato completo da Tool
 */
export function validateToolContract(
  contract: ToolContract
): ToolContractValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar toolKey
  const toolKeyValidation = validateToolKey(contract.toolKey);
  errors.push(...toolKeyValidation.errors);
  warnings.push(...toolKeyValidation.warnings);

  // Validar versão do contrato
  if (!contract.contractVersion || contract.contractVersion.trim().length === 0) {
    warnings.push('Contrato sem versão (recomendado para versionamento)');
  }

  // Validar permissions (versão legado)
  if (contract.permissions?.allPermissions) {
    for (const permKey of contract.permissions.allPermissions) {
      const permValidation = validatePermissionKey(permKey, contract.toolKey);
      errors.push(...permValidation.errors);
      warnings.push(...permValidation.warnings);
    }
  }
  
  // Validar permissionMap (nova versão)
  if (contract.permissionMap) {
    // TODO: Implementar validação completa do novo ToolPermissionMap
    // Por enquanto apenas aviso se estiver usando formato antigo
    if (contract.permissions && !contract.permissionMap) {
      warnings.push('Usando formato legado de permissions. Migre para permissionMap quando possível.');
    }
  }

  // Validar feature flags
  for (const featKey of Object.keys(contract.featureFlags.features)) {
    const featValidation = validateFeatureKey(featKey, contract.toolKey);
    errors.push(...featValidation.errors);
    warnings.push(...featValidation.warnings);
  }

  // Validar menu
  const menuValidation = validateMenuMetadata(contract);
  errors.push(...menuValidation.errors);
  warnings.push(...menuValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Helper para gerar allPermissions a partir de scopes
 * Útil para evitar inconsistência entre scopes e allPermissions
 */
export function generateAllPermissions(
  toolKey: ToolKey | string,
  scopes: ToolPermissionScope[]
): PermissionKey[] {
  const permissions: PermissionKey[] = [];
  const toolKeyStr = toolKey as string;

  for (const scope of scopes) {
    for (const action of scope.actions) {
      permissions.push(`${toolKeyStr}.${scope.scopeId}.${action.actionId}` as PermissionKey);
    }
  }

  return permissions;
}
