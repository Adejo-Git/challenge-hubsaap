/**
 * Barrel export do ToolModule
 * 
 * Entrypoint público da tool para lazy loading e consumo de contrato.
 * 
 * Uso:
 * - Shell Router: import('./tool-module').then(m => m.ToolModule)
 * - Consumo de metadados: import { TOOL_MENU_METADATA } from './tool-module'
 */

export { ToolModule, getToolModule } from './tool.module';

export {
  TOOL_KEY,
  TOOL_ROUTES,
  TOOL_MENU_METADATA,
  TOOL_PERMISSION_MAP,
} from './tool.contract';

export { TOOL_FEATURE_FLAGS } from './tool.feature-flags';
