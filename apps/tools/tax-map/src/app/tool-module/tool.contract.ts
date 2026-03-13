/**
 * Tool Contract: Exports padronizados do contrato da Tool
 * 
 * Este arquivo é a interface pública da tool — o Hub consome estes metadados
 * para construir navegação, aplicar feature flags e avaliar permissões.
 * 
 * Responsabilidades:
 * - Exposição tipada de ToolMenuMetadata
 * - Exposição tipada de ToolPermissionMap
 * - Manter consistência entre rotas, flags e permissões
 * 
 * NÃO deve:
 * - Implementar lógica de negócio
 * - Fazer IO ou HttpClient
 * - Depender de implementações internas além dos modelos públicos
 */

import type {
  ToolMenuMetadata,
  ToolKey,
  ToolMenuItem,
  ToolDeepLink,
} from '@hub/tool-contract';
import { createFeatureKey } from '@hub/tool-contract';
import { TAX_MAP_PERMISSION_KEYS as K } from './tool.permission-map.model';

// Re-exporta para consumo via tool.contract (ponto central do contrato)
export { TOOL_PERMISSION_MAP } from './tool.permission-map';
export { TOOL_ROUTES } from './tool.routes';

/**
 * ToolKey estável da tool
 */
export const TOOL_KEY: ToolKey = 'tax-map' as ToolKey;

/**
 * Metadados de menu e navegação da Tool
 * 
 * Integração:
 * - Consumido pelo NavigationService do Hub para construir menu
 * - DeepLinks devem ser coerentes com rotas declaradas em tool.routes.ts
 */
export const TOOL_MENU_METADATA: ToolMenuMetadata = {
  toolKey: TOOL_KEY,
  accessKey: `tool.${TOOL_KEY}.menu`,
  displayName: 'Example Tool',
  description: 'Ferramenta de exemplo para demonstração do Tool Plugin Contract',
  icon: 'grid',
  order: 100,
  category: 'tools',
  isBeta: false,

  menuItems: [
    {
      id: 'tax-map-home',
      label: 'Início',
      path: 'home',
      icon: 'home',
      order: 1,
      requiredPermissions: [K.VIEW_HOME],
      requiredFeatures: [createFeatureKey('tax-map:home')],
    },
    {
      id: 'tax-map-dashboard',
      label: 'Dashboard',
      path: 'dashboard',
      icon: 'dashboard',
      order: 2,
      requiredPermissions: [K.VIEW_DASHBOARD],
      requiredFeatures: [createFeatureKey('tax-map:dashboard')],
    },
    {
      id: 'tax-map-settings',
      label: 'Configurações',
      path: 'settings',
      icon: 'settings',
      order: 99,
      requiredPermissions: [K.VIEW_SETTINGS],
      requiredFeatures: [createFeatureKey('tax-map:settings')],
    },
  ] satisfies ToolMenuItem[],

  deepLinks: [
    {
      id: 'tax-map-home',
      path: '/tools/tax-map/home',
      label: 'Início',
      description: 'Página inicial da Example Tool',
      icon: 'home',
      requiredPermissions: [K.VIEW_HOME],
      requiredFeatures: [createFeatureKey('tax-map:home')],
    },
    {
      id: 'tax-map-dashboard',
      path: '/tools/tax-map/dashboard',
      label: 'Dashboard',
      description: 'Dashboard com métricas e visão geral',
      icon: 'dashboard',
      requiredPermissions: [K.VIEW_DASHBOARD],
      requiredFeatures: [createFeatureKey('tax-map:dashboard')],
    },
  ] satisfies ToolDeepLink[],
};

// TOOL_PERMISSION_MAP é importado e re-exportado de tool.permission-map.ts
// Fonte única de verdade: apps/tools/tax-map/src/app/tool-module/tool.permission-map.ts
