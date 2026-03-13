/**
 * Tool Menu Metadata - Testes
 * 
 * Valida:
 * - Consistência de toolKey e deep links
 * - Paths relativos (não começam com /tools/)
 * - IDs únicos
 * - Builders funcionam corretamente
 * - Validação detecta erros
 */

import {
  createToolKey,
  createPermissionKey,
  createFeatureKey,
  createDeepLink,
  createMenuItem,
  createToolMenuMetadata,
  validateToolMenuMetadata,
  createDeepLinksFromRoutes,
} from './tool-menu-metadata';

import type {
  ToolMenuMetadata,
} from '../tool-contract.model';

describe('ToolMenuMetadata - Branded Types', () => {
  it('should create ToolKey branded type', () => {
    const key = createToolKey('tax-map');
    expect(key).toBe('tax-map');
  });

  it('should create PermissionKey branded type', () => {
    const key = createPermissionKey('tax-map.items.read');
    expect(key).toBe('tax-map.items.read');
  });

  it('should create FeatureKey branded type', () => {
    const key = createFeatureKey('tax-map.feature-x');
    expect(key).toBe('tax-map.feature-x');
  });
});

describe('ToolMenuMetadata - DeepLink Builder', () => {
  it('should build valid deep link', () => {
    const link = createDeepLink()
      .withId('overview')
      .withPath('overview')
      .withLabel('Visão Geral')
      .withIcon('dashboard')
      .build();

    expect(link).toEqual({
      id: 'overview',
      path: 'overview',
      label: 'Visão Geral',
      icon: 'dashboard',
    });
  });

  it('should build deep link with permissions', () => {
    const link = createDeepLink()
      .withId('create')
      .withPath('create')
      .withLabel('Criar')
      .requiresPermissions('tax-map.items.create')
      .build();

    expect(link.requiredPermissions).toEqual(['tax-map.items.create']);
  });

  it('should build deep link with features', () => {
    const link = createDeepLink()
      .withId('new-flow')
      .withPath('new-flow')
      .withLabel('Novo Fluxo')
      .requiresFeatures('tax-map.new-flow')
      .build();

    expect(link.requiredFeatures).toEqual(['tax-map.new-flow']);
  });

  it('should throw error if id missing', () => {
    expect(() => {
      createDeepLink()
        .withPath('overview')
        .withLabel('Visão Geral')
        .build();
    }).toThrow('DeepLink requer id');
  });

  it('should throw error if path missing', () => {
    expect(() => {
      createDeepLink()
        .withId('overview')
        .withLabel('Visão Geral')
        .build();
    }).toThrow('DeepLink requer path');
  });

  it('should throw error if label missing', () => {
    expect(() => {
      createDeepLink()
        .withId('overview')
        .withPath('overview')
        .build();
    }).toThrow('DeepLink requer label');
  });

  it('should reject absolute paths starting with /tools/', () => {
    expect(() => {
      createDeepLink()
        .withId('overview')
        .withPath('/tools/tax-map/overview')
        .withLabel('Visão Geral')
        .build();
    }).toThrow(/não deve começar com '\/tools\/'/);
  });
});

describe('ToolMenuMetadata - MenuItem Builder', () => {
  it('should build valid menu item', () => {
    const item = createMenuItem()
      .withId('overview')
      .withLabel('Visão Geral')
      .withPath('overview')
      .withIcon('dashboard')
      .withOrder(1)
      .build();

    expect(item).toEqual({
      id: 'overview',
      label: 'Visão Geral',
      path: 'overview',
      icon: 'dashboard',
      order: 1,
    });
  });

  it('should build menu item with children', () => {
    const child = createMenuItem()
      .withId('child')
      .withLabel('Child')
      .build();

    const parent = createMenuItem()
      .withId('parent')
      .withLabel('Parent')
      .withChildren(child)
      .build();

    expect(parent.children).toEqual([child]);
  });

  it('should build menu item with badge', () => {
    const item = createMenuItem()
      .withId('new-feature')
      .withLabel('Nova Feature')
      .withBadge('NEW')
      .build();

    expect(item.badge).toBe('NEW');
  });

  it('should throw error if id missing', () => {
    expect(() => {
      createMenuItem()
        .withLabel('Label')
        .build();
    }).toThrow('MenuItem requer id');
  });

  it('should throw error if label missing', () => {
    expect(() => {
      createMenuItem()
        .withId('item')
        .build();
    }).toThrow('MenuItem requer label');
  });

  it('should reject absolute paths starting with /tools/', () => {
    expect(() => {
      createMenuItem()
        .withId('overview')
        .withLabel('Visão Geral')
        .withPath('/tools/tax-map/overview')
        .build();
    }).toThrow(/não deve começar com '\/tools\/'/);
  });
});

describe('ToolMenuMetadata - Validation', () => {
  it('should validate correct metadata', () => {
    const metadata: ToolMenuMetadata = {
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      description: 'Test tool',
      icon: 'dashboard',
      accessKey: 'tax-map.access',
      menuItems: [
        {
          id: 'overview',
          label: 'Visão Geral',
          path: 'overview',
        },
      ],
      deepLinks: [
        {
          id: 'overview',
          path: 'overview',
          label: 'Visão Geral',
        },
      ],
    };

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('should detect missing toolKey', () => {
    const metadata = {
      displayName: 'Example Tool',
      menuItems: [],
    } as unknown as ToolMenuMetadata;

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('toolKey é obrigatório');
  });

  it('should detect missing displayName', () => {
    const metadata = {
      toolKey: createToolKey('tax-map'),
      menuItems: [],
    } as unknown as ToolMenuMetadata;

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('displayName é obrigatório');
  });

  it('should detect empty menuItems', () => {
    const metadata: ToolMenuMetadata = {
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      accessKey: 'tax-map.access',
      menuItems: [],
    };

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('menuItems não pode estar vazio');
  });

  it('should detect duplicate menu item IDs', () => {
    const metadata: ToolMenuMetadata = {
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      accessKey: 'tax-map.access',
      menuItems: [
        { id: 'overview', label: 'Visão Geral' },
        { id: 'overview', label: 'Outro' },
      ],
    };

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain("ID duplicado em menuItems: 'overview'");
  });

  it('should detect duplicate deep link IDs', () => {
    const metadata: ToolMenuMetadata = {
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      accessKey: 'tax-map.access',
      menuItems: [{ id: 'overview', label: 'Visão Geral' }],
      deepLinks: [
        { id: 'overview', path: 'overview', label: 'Visão Geral' },
        { id: 'overview', path: 'overview2', label: 'Outro' },
      ],
    };

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain("ID duplicado em deepLinks: 'overview'");
  });

  it('should detect absolute paths in menu items', () => {
    const metadata: ToolMenuMetadata = {
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      accessKey: 'tax-map.access',
      menuItems: [
        {
          id: 'overview',
          label: 'Visão Geral',
          path: '/tools/tax-map/overview',
        },
      ],
    };

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => e.includes('path absoluto'))).toBe(true);
  });

  it('should detect absolute paths in deep links', () => {
    const metadata: ToolMenuMetadata = {
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      accessKey: 'tax-map.access',
      menuItems: [{ id: 'overview', label: 'Visão Geral' }],
      deepLinks: [
        {
          id: 'overview',
          path: '/tools/tax-map/overview',
          label: 'Visão Geral',
        },
      ],
    };

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => e.includes('path absoluto'))).toBe(true);
  });

  it('should warn if description missing', () => {
    const metadata: ToolMenuMetadata = {
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      accessKey: 'tax-map.access',
      menuItems: [{ id: 'overview', label: 'Visão Geral' }],
    };

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.warnings).toContain('description não definido (recomendado para UI)');
  });

  it('should warn if icon missing', () => {
    const metadata: ToolMenuMetadata = {
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      accessKey: 'tax-map.access',
      menuItems: [{ id: 'overview', label: 'Visão Geral' }],
    };

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.warnings).toContain('icon não definido (recomendado para UI)');
  });

  it('should warn if deepLinks empty', () => {
    const metadata: ToolMenuMetadata = {
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      accessKey: 'tax-map.access',
      menuItems: [{ id: 'overview', label: 'Visão Geral' }],
    };

    const validation = validateToolMenuMetadata(metadata);
    expect(validation.warnings).toContain(
      'deepLinks vazio (recomendado ter ao menos 1 deep link principal)'
    );
  });
});

describe('ToolMenuMetadata - createToolMenuMetadata', () => {
  it('should create valid metadata', () => {
    const metadata = createToolMenuMetadata({
      toolKey: createToolKey('tax-map'),
      displayName: 'Example Tool',
      description: 'Test tool',
      icon: 'dashboard',
      accessKey: 'tax-map.access',
      menuItems: [
        {
          id: 'overview',
          label: 'Visão Geral',
          path: 'overview',
        },
      ],
    });

    expect(metadata.toolKey).toBe('tax-map');
    expect(metadata.displayName).toBe('Example Tool');
  });

  it('should throw error if validation fails', () => {
    expect(() => {
      createToolMenuMetadata({
        toolKey: createToolKey('tax-map'),
        displayName: 'Example Tool',
        accessKey: 'tax-map.access',
        menuItems: [], // vazio = erro
      });
    }).toThrow('ToolMenuMetadata inválido');
  });
});

describe('ToolMenuMetadata - createDeepLinksFromRoutes', () => {
  it('should create deep links from route context', () => {
    const routes = {
      overview: 'overview',
      list: 'list',
      create: 'create',
    };

    const config = {
      overview: { label: 'Visão Geral', icon: 'dashboard' },
      list: { label: 'Listagem', icon: 'list' },
    };

    const deepLinks = createDeepLinksFromRoutes(routes, config);

    expect(deepLinks).toHaveLength(2);
    expect(deepLinks[0]).toEqual({
      id: 'overview',
      path: 'overview',
      label: 'Visão Geral',
      icon: 'dashboard',
      description: '',
    });
    expect(deepLinks[1]).toEqual({
      id: 'list',
      path: 'list',
      label: 'Listagem',
      icon: 'list',
      description: '',
    });
  });

  it('should throw error if route not found', () => {
    const routes = {
      overview: 'overview',
    };

    const config = {
      list: { label: 'Listagem' },
    };

    expect(() => {
      createDeepLinksFromRoutes(routes, config);
    }).toThrow("Rota 'list' não encontrada no contexto de rotas");
  });
});

