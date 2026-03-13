/**
 * tool-registry.spec.ts
 *
 * Testes unitários do ToolRegistry.
 *
 * Cenários cobertos:
 * 1. Lookup básico: exists, getTool, listTools após load().
 * 2. Ordenação do catálogo por group + order.
 * 3. Filtro de tools quando feature flag correspondente está desligada.
 * 4. Filtro por RuntimeConfig (enabledTools / overrides).
 * 5. Validação de duplicidade de toolKey em devMode.
 * 6. Lançamento de erro quando catálogo não foi carregado (assertLoaded).
 * 7. getMenuNodes retorna MenuNodes derivados dos descritores.
 * 8. reload() recarrega catálogo e aplica novas flags.
 */

import { ToolKey } from '@hub/tool-contract';
import { ToolRegistryService, ToolRegistryFeatureFlagPort } from './tool-registry.service';
import { ToolDescriptor } from './tool-registry.model';
import { detectDuplicateKeys, runDevValidation } from './tool-registry.validation';

// ---------------------------------------------------------------------------
// Helpers: Factories de fixtures
// ---------------------------------------------------------------------------

/**
 * Cria um ToolDescriptor mínimo válido para uso nos testes.
 */
function makeDescriptor(
  toolKey: string,
  group = 'operacional',
  order = 10,
  enabled = true
): ToolDescriptor {
  return {
    toolKey: toolKey as ToolKey,
    label: `Tool ${toolKey}`,
    group,
    order,
    entryPath: `/tools/${toolKey}`,
    version: '1.0.0',
    enabled,
    metadata: {
      toolKey: toolKey as ToolKey,
      displayName: `Tool ${toolKey} Display`,
      icon: 'icon-default',
      accessKey: `tool.${toolKey}.menu`,
      menuItems: [
        {
          id: `${toolKey}-item-1`,
          label: 'Item 1',
          path: 'overview',
          order: 1,
        },
      ],
      deepLinks: [
        {
          id: `${toolKey}-deep-1`,
          path: 'detail',
          label: 'Detail',
        },
      ],
    },
    flags: {
      toolKey: toolKey as ToolKey,
      features: {},
    },
    permissionMap: {
      toolKey: toolKey as ToolKey,
      version: '1.0.0',
      namespace: toolKey,
    },
  };
}

/**
 * Cria um FeatureFlagPort com mapa de flags configurável.
 */
function makeFeatureFlagPort(flags: Record<string, boolean> = {}): ToolRegistryFeatureFlagPort {
  return {
    getEffectiveFlags: () => flags,
  };
}

// ---------------------------------------------------------------------------
// Testes: ToolRegistryService — load + lookup
// ---------------------------------------------------------------------------

describe('ToolRegistryService', () => {
  describe('Inicialização e assertLoaded', () => {
    it('deve lançar StandardError se getTool for chamado antes de load()', () => {
      const service = new ToolRegistryService({ descriptors: [] });

      // assertLoaded deve lançar um erro com estrutura StandardError
      expect(() => service.getTool('financeiro' as ToolKey)).toThrow();
    });

    it('deve lançar StandardError se exists for chamado antes de load()', () => {
      const service = new ToolRegistryService({ descriptors: [] });
      expect(() => service.exists('financeiro' as ToolKey)).toThrow();
    });

    it('deve lançar StandardError se listTools for chamado antes de load()', () => {
      const service = new ToolRegistryService({ descriptors: [] });
      expect(() => service.listTools()).toThrow();
    });

    it('isLoaded() deve retornar false antes de load()', () => {
      const service = new ToolRegistryService({ descriptors: [] });
      expect(service.isLoaded()).toBe(false);
    });

    it('isLoaded() deve retornar true após load()', () => {
      const service = new ToolRegistryService({ descriptors: [] });
      service.load();
      expect(service.isLoaded()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // exists / getTool / listTools
  // -------------------------------------------------------------------------

  describe('exists()', () => {
    it('deve retornar true para toolKey registrada', () => {
      const service = new ToolRegistryService({
        descriptors: [makeDescriptor('financeiro')],
      });
      service.load();

      expect(service.exists('financeiro' as ToolKey)).toBe(true);
    });

    it('deve retornar false para toolKey não registrada', () => {
      const service = new ToolRegistryService({
        descriptors: [makeDescriptor('financeiro')],
      });
      service.load();

      expect(service.exists('nao-existe' as ToolKey)).toBe(false);
    });

    it('deve retornar false para catálogo vazio', () => {
      const service = new ToolRegistryService({ descriptors: [] });
      service.load();

      expect(service.exists('financeiro' as ToolKey)).toBe(false);
    });
  });

  describe('getTool()', () => {
    it('deve retornar found=true com descriptor para toolKey existente', () => {
      const descriptor = makeDescriptor('rh-core', 'rh', 5);
      const service = new ToolRegistryService({ descriptors: [descriptor] });
      service.load();

      const result = service.getTool('rh-core' as ToolKey);

      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.descriptor.toolKey).toBe('rh-core');
        expect(result.descriptor.group).toBe('rh');
      }
    });

    it('deve retornar found=false com reason=notFound para toolKey inexistente', () => {
      const service = new ToolRegistryService({ descriptors: [] });
      service.load();

      const result = service.getTool('inexistente' as ToolKey);

      expect(result.found).toBe(false);
      // Type guard: garante que result é do tipo { found: false; ... }
      if (result.found === false) {
        expect(result.reason).toBe('notFound');
        expect(result.toolKey).toBe('inexistente' as ToolKey);
      }
    });
  });

  describe('listTools()', () => {
    it('deve listar todas as tools carregadas', () => {
      const service = new ToolRegistryService({
        descriptors: [
          makeDescriptor('financeiro'),
          makeDescriptor('rh-core'),
          makeDescriptor('audit-trail'),
        ],
      });
      service.load();

      const tools = service.listTools();
      expect(tools).toHaveLength(3);
    });

    it('deve retornar array vazio para catálogo vazio', () => {
      const service = new ToolRegistryService({ descriptors: [] });
      service.load();

      expect(service.listTools()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Ordenação
  // -------------------------------------------------------------------------

  describe('Ordenação por group + order', () => {
    it('deve ordenar tools por group alfabeticamente e depois por order', () => {
      const service = new ToolRegistryService({
        descriptors: [
          makeDescriptor('z-tool', 'grupo-z', 1),
          makeDescriptor('b-tool', 'grupo-a', 10),
          makeDescriptor('a-tool', 'grupo-a', 5),
        ],
      });
      service.load();

      const tools = service.listTools();
      const keys = tools.map((t) => t.toolKey);

      // grupo-a vem antes de grupo-z; dentro de grupo-a, order 5 < 10
      expect(keys).toEqual(['a-tool', 'b-tool', 'z-tool']);
    });
  });

  // -------------------------------------------------------------------------
  // Filtro por Feature Flags
  // -------------------------------------------------------------------------

  describe('Filtro por Feature Flags', () => {
    it('deve remover tool quando flag <toolKey>.enabled está false', () => {
      const flags = { 'financeiro.enabled': false };
      const service = new ToolRegistryService(
        {
          descriptors: [
            makeDescriptor('financeiro'),
            makeDescriptor('rh-core'),
          ],
        },
        makeFeatureFlagPort(flags)
      );
      service.load();

      const tools = service.listTools();
      const keys = tools.map((t) => t.toolKey);

      expect(keys).not.toContain('financeiro');
      expect(keys).toContain('rh-core');
    });

    it('deve manter tool quando flag <toolKey>.enabled está true', () => {
      const flags = { 'financeiro.enabled': true };
      const service = new ToolRegistryService(
        { descriptors: [makeDescriptor('financeiro')] },
        makeFeatureFlagPort(flags)
      );
      service.load();

      expect(service.exists('financeiro' as ToolKey)).toBe(true);
    });

    it('deve manter tool quando flag não existe (default habilitado)', () => {
      const service = new ToolRegistryService(
        { descriptors: [makeDescriptor('financeiro')] },
        makeFeatureFlagPort({}) // sem flag específica
      );
      service.load();

      expect(service.exists('financeiro' as ToolKey)).toBe(true);
    });

    it('deve remover todas as tools quando todas as flags estão false', () => {
      const service = new ToolRegistryService(
        {
          descriptors: [
            makeDescriptor('financeiro'),
            makeDescriptor('rh-core'),
          ],
        },
        makeFeatureFlagPort({
          'financeiro.enabled': false,
          'rh-core.enabled': false,
        })
      );
      service.load();

      expect(service.listTools()).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // RuntimeConfig
  // -------------------------------------------------------------------------

  describe('RuntimeConfig (OnPrem enabledTools + overrides)', () => {
    it('deve carregar apenas tools presentes em enabledTools', () => {
      const service = new ToolRegistryService({
        descriptors: [
          makeDescriptor('financeiro'),
          makeDescriptor('rh-core'),
          makeDescriptor('audit-trail'),
        ],
        runtimeConfig: {
          enabledTools: ['financeiro' as ToolKey, 'audit-trail' as ToolKey],
        },
      });
      service.load();

      const keys = service.listTools().map((t) => t.toolKey);
      expect(keys).toContain('financeiro');
      expect(keys).toContain('audit-trail');
      expect(keys).not.toContain('rh-core');
    });

    it('deve aplicar overrides de group/order do RuntimeConfig', () => {
      const service = new ToolRegistryService({
        descriptors: [makeDescriptor('financeiro', 'grupo-original', 5)],
        runtimeConfig: {
          overrides: {
            ['financeiro' as ToolKey]: { group: 'grupo-customizado', order: 1 },
          },
        },
      });
      service.load();

      const result = service.getTool('financeiro' as ToolKey);
      expect(result.found).toBe(true);
      if (result.found) {
        expect(result.descriptor.group).toBe('grupo-customizado');
        expect(result.descriptor.order).toBe(1);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getMenuNodes
  // -------------------------------------------------------------------------

  describe('getMenuNodes()', () => {
    it('deve retornar MenuNodes com path, label e toolKey corretos', () => {
      const service = new ToolRegistryService({
        descriptors: [makeDescriptor('financeiro', 'financeiro', 1)],
      });
      service.load();

      const nodes = service.getMenuNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].toolKey).toBe('financeiro');
      expect(nodes[0].path).toBe('/tools/financeiro');
      expect(nodes[0].group).toBe('financeiro');
    });

    it('deve retornar array vazio quando catálogo está vazio', () => {
      const service = new ToolRegistryService({ descriptors: [] });
      service.load();

      expect(service.getMenuNodes()).toHaveLength(0);
    });

    it('deve excluir do menu tools filtradas por flags', () => {
      const service = new ToolRegistryService(
        {
          descriptors: [
            makeDescriptor('financeiro'),
            makeDescriptor('rh-core'),
          ],
        },
        makeFeatureFlagPort({ 'financeiro.enabled': false })
      );
      service.load();

      const nodes = service.getMenuNodes();
      const keys = nodes.map((n) => n.toolKey);
      expect(keys).not.toContain('financeiro');
      expect(keys).toContain('rh-core');
    });
  });

  // -------------------------------------------------------------------------
  // reload()
  // -------------------------------------------------------------------------

  describe('reload()', () => {
    it('deve recarregar catálogo e aplicar novas flags após reload()', () => {
      let currentFlags: Record<string, boolean> = {};

      const featureFlagPort: ToolRegistryFeatureFlagPort = {
        getEffectiveFlags: () => currentFlags,
      };

      const service = new ToolRegistryService(
        { descriptors: [makeDescriptor('financeiro'), makeDescriptor('rh-core')] },
        featureFlagPort
      );

      // Primeira carga: todas habilitadas
      service.load();
      expect(service.listTools()).toHaveLength(2);

      // Simula mudança de contexto: financeiro desabilitado
      currentFlags = { 'financeiro.enabled': false };
      service.reload();

      expect(service.listTools()).toHaveLength(1);
      expect(service.exists('financeiro' as ToolKey)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // buildNotFoundError
  // -------------------------------------------------------------------------

  describe('buildNotFoundError()', () => {
    it('deve retornar StandardError com code NOT_FOUND e toolKey nos detalhes', () => {
      const service = new ToolRegistryService({ descriptors: [] });
      const error = service.buildNotFoundError('inexistente' as ToolKey);

      expect(error.code).toBe('NOT_FOUND');
      expect(error.detailsSafe).toMatchObject({ toolKey: 'inexistente' });
    });
  });
});

// ---------------------------------------------------------------------------
// Testes: detectDuplicateKeys (validation)
// ---------------------------------------------------------------------------

describe('detectDuplicateKeys', () => {
  it('deve retornar lista vazia quando não há duplicatas', () => {
    const descriptors = [
      makeDescriptor('financeiro'),
      makeDescriptor('rh-core'),
    ];
    expect(detectDuplicateKeys(descriptors)).toHaveLength(0);
  });

  it('deve detectar toolKey duplicado', () => {
    const descriptors = [
      makeDescriptor('financeiro'),
      makeDescriptor('financeiro'), // duplicata
      makeDescriptor('rh-core'),
    ];
    const duplicates = detectDuplicateKeys(descriptors);
    expect(duplicates).toContain('financeiro');
    expect(duplicates).toHaveLength(1);
  });

  it('deve detectar múltiplos toolKeys duplicados', () => {
    const descriptors = [
      makeDescriptor('financeiro'),
      makeDescriptor('financeiro'),
      makeDescriptor('rh-core'),
      makeDescriptor('rh-core'),
    ];
    const duplicates = detectDuplicateKeys(descriptors);
    expect(duplicates).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Testes: runDevValidation (modo dev)
// ---------------------------------------------------------------------------

describe('runDevValidation', () => {
  it('deve retornar isValid=true em produção (devMode=false) sem processar', () => {
    const descriptors = [
      makeDescriptor('financeiro'),
      makeDescriptor('financeiro'), // duplicata — seria erro em dev
    ];
    const result = runDevValidation(descriptors, false);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('deve retornar isValid=false quando há toolKeys duplicados em devMode', () => {
    const descriptors = [
      makeDescriptor('financeiro'),
      makeDescriptor('financeiro'),
    ];
    const result = runDevValidation(descriptors, true);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('financeiro');
  });

  it('deve emitir warning para deepLink com path vazio em devMode', () => {
    const desc = makeDescriptor('financeiro');
    desc.metadata.deepLinks = [
      { id: 'link-1', path: '', label: 'Link inválido' },
    ];

    const result = runDevValidation([desc], true);
    expect(result.warnings.some((w) => w.includes('path vazio'))).toBe(true);
  });

  it('deve emitir warning para deepLink com path absoluto em devMode', () => {
    const desc = makeDescriptor('financeiro');
    desc.metadata.deepLinks = [
      { id: 'link-1', path: '/absoluto/path', label: 'Link absoluto' },
    ];

    const result = runDevValidation([desc], true);
    expect(result.warnings.some((w) => w.includes('path absoluto'))).toBe(true);
  });
});
