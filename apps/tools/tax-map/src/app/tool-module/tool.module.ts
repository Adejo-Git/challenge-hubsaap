/**
 * ToolModule - Entrypoint lazy padronizado da Tool
 * 
 * Este é o ponto de entrada para carregamento da tool via lazy loading
 * pelo Router do Shell. Agrega rotas, componente raiz e exports do contrato.
 * 
 * Responsabilidades:
 * - Ser carregável via lazy loading (loadChildren / loadComponent)
 * - Publicar contrato completo (routes + metadata + flags + permissions)
 * - Agregar ToolRootComponent como container principal
 * - Garantir desacoplamento do Shell (sem imports diretos de internals)
 * - Manter plugin "registrável" com metadados determinísticos
 * 
 * NÃO deve:
 * - Implementar decisões de acesso (responsabilidade do Access Layer)
 * - Fazer IO direto com HttpClient (usar Tool Data-Access SDK)
 * - Registrar-se no Hub diretamente (quem registra é ToolRegistry)
 * - Definir UI global do Hub (layout é do Shell/UI Layout)
 * - Concentrar lógica de negócio (apenas entrypoint e wiring)
 * 
 * Integração com Shell:
 * No Router do Shell:
 * {
 *   path: 'tools/tax-map',
 *   loadChildren: () => import('./tool.module').then(m => m.ToolModule)
 * }
 */

import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

// Rotas internas da tool
import { TOOL_ROUTES } from './tool.routes';

// Contrato da tool (metadata + permissions)
import {
  TOOL_KEY,
  TOOL_MENU_METADATA,
  TOOL_PERMISSION_MAP,
} from './tool.contract';

// Feature flags da tool
import { TOOL_FEATURE_FLAGS } from './tool.feature-flags';

/**
 * ToolModule
 * 
 * Módulo Angular que serve como entrypoint lazy para a tool.
 * Configurado para ser carregado via Router.loadChildren().
 * 
 * Exports estáticos:
 * - toolKey: identificador único da tool
 * - routes: rotas internas
 * - menuMetadata: metadados para menu do Hub
 * - featureFlags: flags de capacidades
 * - permissionMap: mapa de permissões
 */
@NgModule({
  imports: [
    CommonModule,
    // Registra as rotas internas como children
    RouterModule.forChild(TOOL_ROUTES),
  ],
  exports: [RouterModule],
})
export class ToolModule {
  /**
   * Exports estáticos do contrato da Tool
   * 
   * Consumidos pelo Shell/ToolRegistry para integração.
   * Estes metadados são determinísticos e versionáveis.
   */
  static readonly toolKey = TOOL_KEY;
  static readonly routes = TOOL_ROUTES;
  static readonly menuMetadata = TOOL_MENU_METADATA;
  static readonly featureFlags = TOOL_FEATURE_FLAGS;
  static readonly permissionMap = TOOL_PERMISSION_MAP;

  /**
   * Versão do contrato
   * Usado para validação de compatibilidade com o Hub
   */
  static readonly contractVersion = '1.0.0';
}

/**
 * Factory function para lazy loading
 * 
 * Uso no Shell:
 * loadChildren: () => import('./tool.module').then(m => m.getToolModule())
 */
export function getToolModule() {
  return ToolModule;
}

/**
 * Exports nomeados para consumo externo
 * 
 * Permite importação direta dos metadados sem instanciar o módulo:
 * import { TOOL_ROUTES, TOOL_MENU_METADATA } from './tool.module';
 */
export { TOOL_KEY, TOOL_MENU_METADATA, TOOL_PERMISSION_MAP } from './tool.contract';
export { TOOL_ROUTES } from './tool.routes';
export { TOOL_FEATURE_FLAGS } from './tool.feature-flags';
