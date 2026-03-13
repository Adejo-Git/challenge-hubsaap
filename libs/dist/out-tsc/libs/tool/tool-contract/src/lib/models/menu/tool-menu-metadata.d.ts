/**
 * Tool Menu Metadata - Helpers e Builders
 *
 * Fornece utilitários para construir ToolMenuMetadata de forma
 * tipada, consistente e validada.
 *
 * Responsabilidades:
 * - Builders fluentes para deep links e menu items
 * - Validação de metadata (consistência de paths, toolKey, etc.)
 * - Helpers para construção rápida de metadata
 *
 * Non-responsibilities:
 * - Não carrega dados externos
 * - Não implementa lógica de visibilidade (isso é AccessDecision)
 * - Não contém regras de negócio
 */
import type { ToolKey, ToolDeepLink, PermissionKey, FeatureKey } from '../tool-contract.model';
import type { ToolMenuMetadata } from '../tool-contract.model';
import type { ToolMenuMetadataConfig, ToolMenuMetadataValidation, DeepLinkBuilder, MenuItemBuilder } from './tool-menu-metadata.model';
/**
 * Cria branded type ToolKey
 * Helper de tipo para garantir type safety
 */
export declare function createToolKey(key: string): ToolKey;
/**
 * Cria branded type PermissionKey
 */
export declare function createPermissionKey(key: string): PermissionKey;
/**
 * Cria branded type FeatureKey
 */
export declare function createFeatureKey(key: string): FeatureKey;
/**
 * Cria builder de deep link
 *
 * Exemplo:
 * ```ts
 * const link = createDeepLink()
 *   .withId('overview')
 *   .withPath('overview')
 *   .withLabel('Visão Geral')
 *   .withIcon('dashboard')
 *   .build();
 * ```
 */
export declare function createDeepLink(): DeepLinkBuilder;
/**
 * Cria builder de menu item
 *
 * Exemplo:
 * ```ts
 * const item = createMenuItem()
 *   .withId('list')
 *   .withLabel('Listagem')
 *   .withPath('list')
 *   .withIcon('list')
 *   .withOrder(1)
 *   .build();
 * ```
 */
export declare function createMenuItem(): MenuItemBuilder;
/**
 * Valida ToolMenuMetadata
 *
 * Verifica:
 * - ToolKey definido
 * - DisplayName definido
 * - Menu items não vazio
 * - Paths relativos (não começam com /tools/)
 * - IDs únicos em menu items e deep links
 *
 * @param metadata Metadata a validar
 * @returns Resultado da validação
 */
export declare function validateToolMenuMetadata(metadata: ToolMenuMetadata): ToolMenuMetadataValidation;
/**
 * Helper para criar ToolMenuMetadata completo com validação
 *
 * Exemplo:
 * ```ts
 * const metadata = createToolMenuMetadata({
 *   toolKey: createToolKey('tax-map'),
 *   displayName: 'Example Tool',
 *   description: 'Ferramenta de exemplo',
 *   icon: 'dashboard',
 *   category: ToolCategory.Core,
 *   order: 10,
 *   menuItems: [
 *     createMenuItem()
 *       .withId('overview')
 *       .withLabel('Visão Geral')
 *       .withPath('overview')
 *       .build()
 *   ],
 *   deepLinks: [
 *     createDeepLink()
 *       .withId('overview')
 *       .withPath('overview')
 *       .withLabel('Visão Geral')
 *       .build()
 *   ]
 * });
 * ```
 *
 * @param config Configuração do metadata
 * @returns ToolMenuMetadata validado
 * @throws Error se validação falhar
 */
export declare function createToolMenuMetadata(config: ToolMenuMetadataConfig): ToolMenuMetadata;
/**
 * Helper para criar deep links a partir de contexto de rotas
 * Facilita manter consistência entre rotas e deep links
 *
 * Exemplo:
 * ```ts
 * const routes = {
 *   overview: 'overview',
 *   list: 'list',
 *   create: 'create'
 * };
 *
 * const deepLinks = createDeepLinksFromRoutes(routes, {
 *   overview: { label: 'Visão Geral', icon: 'dashboard' },
 *   list: { label: 'Listagem', icon: 'list' }
 * });
 * ```
 */
export declare function createDeepLinksFromRoutes(routes: Record<string, string>, config: Record<string, {
    label: string;
    icon?: string;
    description?: string;
}>): ToolDeepLink[];
//# sourceMappingURL=tool-menu-metadata.d.ts.map