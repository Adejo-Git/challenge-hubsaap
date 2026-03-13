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

import type {
  ToolKey,
  ToolMenuItem,
  ToolDeepLink,
  PermissionKey,
  FeatureKey,
} from '../tool-contract.model';
import type { ToolMenuMetadata } from '../tool-contract.model';

import type {
  ToolMenuMetadataConfig,
  ToolMenuMetadataValidation,
  DeepLinkBuilder,
  MenuItemBuilder,
} from './tool-menu-metadata.model';

/**
 * Cria branded type ToolKey
 * Helper de tipo para garantir type safety
 */
export function createToolKey(key: string): ToolKey {
  return key as ToolKey;
}

/**
 * Cria branded type PermissionKey
 */
export function createPermissionKey(key: string): PermissionKey {
  return key as PermissionKey;
}

/**
 * Cria branded type FeatureKey
 */
export function createFeatureKey(key: string): FeatureKey {
  return key as FeatureKey;
}

/**
 * Builder fluente para ToolDeepLink
 */
class DeepLinkBuilderImpl implements DeepLinkBuilder {
  private deepLink: Partial<ToolDeepLink> = {};

  withId(id: string): DeepLinkBuilder {
    this.deepLink.id = id;
    return this;
  }

  withPath(path: string): DeepLinkBuilder {
    // Garantir que path não começa com /tools/
    if (path.startsWith('/tools/')) {
      throw new Error(
        `DeepLink path não deve começar com '/tools/'. Use path relativo: '${path.replace(/^\/tools\/[^/]+\//, '')}'`
      );
    }
    this.deepLink.path = path;
    return this;
  }

  withLabel(label: string): DeepLinkBuilder {
    this.deepLink.label = label;
    return this;
  }

  withDescription(description: string): DeepLinkBuilder {
    this.deepLink.description = description;
    return this;
  }

  withIcon(icon: string): DeepLinkBuilder {
    this.deepLink.icon = icon;
    return this;
  }

  requiresPermissions(...permissions: string[]): DeepLinkBuilder {
    this.deepLink.requiredPermissions = permissions.map(createPermissionKey);
    return this;
  }

  requiresFeatures(...features: string[]): DeepLinkBuilder {
    this.deepLink.requiredFeatures = features.map(createFeatureKey);
    return this;
  }

  build(): ToolDeepLink {
    if (!this.deepLink.id) {
      throw new Error('DeepLink requer id');
    }
    if (!this.deepLink.path) {
      throw new Error('DeepLink requer path');
    }
    if (!this.deepLink.label) {
      throw new Error('DeepLink requer label');
    }
    
    return this.deepLink as ToolDeepLink;
  }
}

/**
 * Builder fluente para ToolMenuItem
 */
class MenuItemBuilderImpl implements MenuItemBuilder {
  private menuItem: Partial<ToolMenuItem> = {};

  withId(id: string): MenuItemBuilder {
    this.menuItem.id = id;
    return this;
  }

  withLabel(label: string): MenuItemBuilder {
    this.menuItem.label = label;
    return this;
  }

  withPath(path: string): MenuItemBuilder {
    // Garantir que path não começa com /tools/
    if (path.startsWith('/tools/')) {
      throw new Error(
        `MenuItem path não deve começar com '/tools/'. Use path relativo: '${path.replace(/^\/tools\/[^/]+\//, '')}'`
      );
    }
    this.menuItem.path = path;
    return this;
  }

  withIcon(icon: string): MenuItemBuilder {
    this.menuItem.icon = icon;
    return this;
  }

  withOrder(order: number): MenuItemBuilder {
    this.menuItem.order = order;
    return this;
  }

  withBadge(badge: string): MenuItemBuilder {
    this.menuItem.badge = badge;
    return this;
  }

  withChildren(...children: ToolMenuItem[]): MenuItemBuilder {
    this.menuItem.children = children;
    return this;
  }

  requiresPermissions(...permissions: string[]): MenuItemBuilder {
    this.menuItem.requiredPermissions = permissions.map(createPermissionKey);
    return this;
  }

  requiresFeatures(...features: string[]): MenuItemBuilder {
    this.menuItem.requiredFeatures = features.map(createFeatureKey);
    return this;
  }

  build(): ToolMenuItem {
    if (!this.menuItem.id) {
      throw new Error('MenuItem requer id');
    }
    if (!this.menuItem.label) {
      throw new Error('MenuItem requer label');
    }
    
    return this.menuItem as ToolMenuItem;
  }
}

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
export function createDeepLink(): DeepLinkBuilder {
  return new DeepLinkBuilderImpl();
}

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
export function createMenuItem(): MenuItemBuilder {
  return new MenuItemBuilderImpl();
}

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
export function validateToolMenuMetadata(
  metadata: ToolMenuMetadata
): ToolMenuMetadataValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validações obrigatórias
  if (!metadata.toolKey) {
    errors.push('toolKey é obrigatório');
  }

  if (!metadata.displayName) {
    errors.push('displayName é obrigatório');
  }

  if (!metadata.menuItems || metadata.menuItems.length === 0) {
    errors.push('menuItems não pode estar vazio');
  }

  // Validar menu items
  const menuItemIds = new Set<string>();
  const validateMenuItems = (items: ToolMenuItem[], prefix = ''): void => {
    items.forEach((item) => {
      const fullId = prefix + item.id;
      
      if (menuItemIds.has(fullId)) {
        errors.push(`ID duplicado em menuItems: '${fullId}'`);
      }
      menuItemIds.add(fullId);

      if (item.path && item.path.startsWith('/tools/')) {
        errors.push(
          `MenuItem '${item.id}' tem path absoluto. Use path relativo: '${item.path}'`
        );
      }

      if (item.children && item.children.length > 0) {
        validateMenuItems(item.children, `${fullId}.`);
      }
    });
  };

  if (metadata.menuItems) {
    validateMenuItems(metadata.menuItems);
  }

  // Validar deep links
  if (metadata.deepLinks && metadata.deepLinks.length > 0) {
    const deepLinkIds = new Set<string>();
    
    metadata.deepLinks.forEach((link) => {
      if (deepLinkIds.has(link.id)) {
        errors.push(`ID duplicado em deepLinks: '${link.id}'`);
      }
      deepLinkIds.add(link.id);

      if (link.path.startsWith('/tools/')) {
        errors.push(
          `DeepLink '${link.id}' tem path absoluto. Use path relativo: '${link.path}'`
        );
      }
    });
  }

  // Avisos (não bloqueantes)
  if (!metadata.description) {
    warnings.push('description não definido (recomendado para UI)');
  }

  if (!metadata.icon) {
    warnings.push('icon não definido (recomendado para UI)');
  }

  if (!metadata.deepLinks || metadata.deepLinks.length === 0) {
    warnings.push('deepLinks vazio (recomendado ter ao menos 1 deep link principal)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

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
export function createToolMenuMetadata(
  config: ToolMenuMetadataConfig
): ToolMenuMetadata {
  const metadata: ToolMenuMetadata = {
    toolKey: config.toolKey as ToolKey,
    displayName: config.displayName,
    description: config.description,
    icon: config.icon,
    order: config.order,
    menuItems: config.menuItems,
    deepLinks: config.deepLinks,
    category: config.category,
    isBeta: config.isBeta,
    accessKey: config.accessKey || `tool.${config.toolKey}.menu`,
    breadcrumbTemplate: config.breadcrumbTemplate,
  };

  // Validar
  const validation = validateToolMenuMetadata(metadata);
  
  if (!validation.isValid) {
    throw new Error(
      `ToolMenuMetadata inválido:\n${validation.errors.join('\n')}`
    );
  }

  // Log warnings se houver (em dev)
  if (validation.warnings.length > 0 && typeof console !== 'undefined') {
    console.warn(
      `[ToolMenuMetadata] Avisos para '${metadata.toolKey}':\n${validation.warnings.join('\n')}`
    );
  }

  return metadata;
}

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
export function createDeepLinksFromRoutes(
  routes: Record<string, string>,
  config: Record<string, { label: string; icon?: string; description?: string }>
): ToolDeepLink[] {
  return Object.entries(config).map(([id, cfg]) => {
    const path = routes[id];
    if (!path) {
      throw new Error(`Rota '${id}' não encontrada no contexto de rotas`);
    }

    return createDeepLink()
      .withId(id)
      .withPath(path)
      .withLabel(cfg.label)
      .withIcon(cfg.icon || '')
      .withDescription(cfg.description || '')
      .build();
  });
}

// ...existing code...
