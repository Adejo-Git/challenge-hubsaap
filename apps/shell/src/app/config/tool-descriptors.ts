/**
 * Tool Descriptors Configuration
 *
 * Registro centralizado de tools disponíveis no Hub.
 * Cada tool exporta seu contrato (metadata, flags, permissions, routes)
 * e este arquivo consolida os descritores para o ToolRegistry.
 *
 * Responsabilidades:
 * - Importar contratos de ferramentas (tool.contract.ts)
 * - Criar ToolDescriptor para cada tool
 * - Exportar lista consolidada para ToolRegistry
 *
 * Integração:
 * - Consumido pelo app.config.ts para inicializar ToolRegistryService
 * - Cada nova tool deve ser registrada aqui
 */

import { ToolDescriptor, ToolContractVersion } from '@hub/tool-registry';
import { ToolKey } from '@hub/tool-contract';

// Import tool contracts
import {
  TOOL_KEY as ACADEMY_KEY,
  TOOL_MENU_METADATA as ACADEMY_METADATA,
  TOOL_FEATURE_FLAGS as ACADEMY_FLAGS,
  TOOL_PERMISSION_MAP as ACADEMY_PERMISSIONS,
} from '../../../../../apps/tools/academy/src/app/tool-module/tool.contract';

/**
 * Tool Descriptors Registry
 *
 * Lista de todos os tools disponíveis no Hub.
 * Cada descriptor contém os metadados necessários para:
 * - Registro no ToolRegistry
 * - Construção de menu
 * - Validação de rotas
 * - Aplicação de feature flags e permissões
 */
export const TOOL_DESCRIPTORS: ToolDescriptor[] = [
  // Academy Tool
  {
    toolKey: ACADEMY_KEY,
    label: ACADEMY_METADATA.displayName,
    group: ACADEMY_METADATA.category || 'core',
    order: ACADEMY_METADATA.order,
    entryPath: `/tools/${ACADEMY_KEY}`,
    metadata: ACADEMY_METADATA,
    flags: ACADEMY_FLAGS,
    permissionMap: ACADEMY_PERMISSIONS,
    version: '1.0.0' as ToolContractVersion,
    enabled: true,
  },

  // Adicionar outras tools aqui conforme necessário
  // Exemplo:
  // {
  //   toolKey: TAX_MAP_KEY,
  //   label: TAX_MAP_METADATA.displayName,
  //   group: TAX_MAP_METADATA.category || 'financeiro',
  //   order: TAX_MAP_METADATA.order,
  //   entryPath: `/tools/${TAX_MAP_KEY}`,
  //   metadata: TAX_MAP_METADATA,
  //   flags: TAX_MAP_FLAGS,
  //   permissionMap: TAX_MAP_PERMISSIONS,
  //   version: '1.0.0' as ToolContractVersion,
  //   enabled: true,
  // },
];
