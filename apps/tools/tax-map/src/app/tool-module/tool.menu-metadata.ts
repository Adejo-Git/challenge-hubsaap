import {
  createToolKey,
  type ToolMenuMetadata,
} from '@hub/tool-contract';
import { TAX_MAP_PERMISSION_KEYS as K } from './tool.permission-map.model';

/**
 * ToolMenuMetadata de exemplo da tax-map tool
 * 
 * Exporta o cartão de identidade da tool para o Hub.
 * 
 * NOTA: Este arquivo serve como exemplo/referência.
 * O contrato oficial está em tool.contract.ts (TOOL_MENU_METADATA).
 * 
 * Mantém as rotas reais da tool: home, dashboard, settings, details.
 * Permissões declaradas via TAX_MAP_PERMISSION_KEYS (sem magic strings).
 */
export const EXAMPLE_TOOL_MENU_METADATA: ToolMenuMetadata = {
  toolKey: createToolKey('tax-map'),
  accessKey: 'tool.tax-map.menu',
  displayName: 'Example Tool',
  description: 'Ferramenta de exemplo para demonstração',
  icon: 'dashboard',
  category: 'core',
  order: 100,
  isBeta: false,
  menuItems: [
    {
      id: 'home',
      label: 'Início',
      path: 'home',
      icon: 'home',
      order: 1,
      requiredPermissions: [K.VIEW_HOME],
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: 'dashboard',
      icon: 'dashboard',
      order: 2,
      requiredPermissions: [K.VIEW_DASHBOARD],
    },
    {
      id: 'settings',
      label: 'Configurações',
      path: 'settings',
      icon: 'settings',
      order: 3,
      requiredPermissions: [K.VIEW_SETTINGS, K.ADMIN_CONFIG],
    },
  ],
  deepLinks: [
    {
      id: 'home',
      path: 'home',
      label: 'Início',
      description: 'Página inicial da ferramenta',
      icon: 'home',
      requiredPermissions: [K.VIEW_HOME],
    },
    {
      id: 'dashboard',
      path: 'dashboard',
      label: 'Dashboard',
      description: 'Dashboard com métricas e visão geral',
      icon: 'dashboard',
      requiredPermissions: [K.VIEW_DASHBOARD],
    },
    {
      id: 'settings',
      path: 'settings',
      label: 'Configurações',
      description: 'Configurações da tool',
      icon: 'settings',
      requiredPermissions: [K.VIEW_SETTINGS, K.ADMIN_CONFIG],
    },
  ],
};
