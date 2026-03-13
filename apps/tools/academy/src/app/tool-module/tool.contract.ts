/**
 * Academy Tool Contract
 *
 * Exports padronizados do contrato da Tool Academy.
 * Este arquivo é a interface pública da tool — o Hub consome estes metadados
 * para construir navegação, aplicar feature flags e avaliar permissões.
 *
 * Responsabilidades:
 * - Exposição tipada de ToolMenuMetadata
 * - Exposição tipada de ToolPermissionMap
 * - Exposição tipada de ToolFeatureFlags
 * - Manter consistência entre rotas, flags e permissões
 *
 * NÃO deve:
 * - Implementar lógica de negócio
 * - Fazer IO ou HttpClient
 * - Depender de implementações internas além dos modelos públicos
 */

import type { ToolKey } from '@hub/tool-contract';

// Re-exporta para consumo via tool.contract (ponto central do contrato)
export { TOOL_PERMISSION_MAP } from './tool.permission-map';
export { TOOL_ROUTES } from './tool.routes';
export { TOOL_MENU_METADATA } from './tool.menu-metadata';
export { TOOL_FEATURE_FLAGS } from './tool.feature-flags';

/**
 * ToolKey estável da tool Academy
 */
export const TOOL_KEY: ToolKey = 'academy' as ToolKey;


