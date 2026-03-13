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
import { ToolContract, ToolKey, PermissionKey, FeatureKey, ToolDeepLink, ToolContractValidationResult, ToolPermissionScope } from '../models/tool-contract.model';
/**
 * Valida formato do ToolKey
 * Recomendado: kebab-case, lowercase, sem espaços
 */
export declare function validateToolKey(toolKey: ToolKey | string): ToolContractValidationResult;
/**
 * Valida formato de PermissionKey
 * Formato esperado: ${toolKey}..
 */
export declare function validatePermissionKey(permissionKey: PermissionKey | string, toolKey: ToolKey | string): ToolContractValidationResult;
/**
 * Valida formato de FeatureKey
 * Formato esperado: ${toolKey}.
 */
export declare function validateFeatureKey(featureKey: FeatureKey | string, toolKey: ToolKey | string): ToolContractValidationResult;
/**
 * Valida deep link
 * - Path deve ser relativo (não começar com /)
 * - ID deve ser único
 * - Permissions/features devem existir no contrato
 */
export declare function validateDeepLink(deepLink: ToolDeepLink, toolKey: ToolKey | string, declaredPermissions: Set<PermissionKey> | Set<string>, declaredFeatures: Set<FeatureKey> | Set<string>): ToolContractValidationResult;
/**
 * Valida menu metadata
 */
export declare function validateMenuMetadata(contract: ToolContract): ToolContractValidationResult;
/**
 * Valida contrato completo da Tool
 */
export declare function validateToolContract(contract: ToolContract): ToolContractValidationResult;
/**
 * Helper para gerar allPermissions a partir de scopes
 * Útil para evitar inconsistência entre scopes e allPermissions
 */
export declare function generateAllPermissions(toolKey: ToolKey | string, scopes: ToolPermissionScope[]): PermissionKey[];
//# sourceMappingURL=tool-contract.validation.d.ts.map