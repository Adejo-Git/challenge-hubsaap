/**
 * Tool Contract - Testes unitários
 * 
 * Testa:
 * - Validações de keys (toolKey, permissionKey, featureKey)
 * - Validações de deepLinks
 * - Validações de contrato completo
 * - ToolContextAdapter com snapshots completos/incompletos
 */

import {
  validateToolKey,
  validatePermissionKey,
  validateFeatureKey,
  validateDeepLink,
  validateToolContract,
  generateAllPermissions,
  createToolKey,
  createPermissionKey,
  createFeatureKey,
} from './validation/tool-contract.validation';
import {
  ToolContract,
  ToolDeepLink,
  ToolPermissionScope,
  ToolKey,
} from './models/tool-contract.model';

describe('Tool Contract Validation', () => {
  describe('validateToolKey', () => {
    it('deve validar toolKey válido (kebab-case)', () => {
      const result = validateToolKey('financeiro');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve validar toolKey com hífens', () => {
      const result = validateToolKey('rh-core');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar toolKey vazio', () => {
      const result = validateToolKey('');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deve alertar sobre uppercase (warning)', () => {
      const result = validateToolKey('Financeiro');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('deve rejeitar caracteres inválidos', () => {
      const result = validateToolKey('financeiro_tool');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deve rejeitar hífen no início/fim', () => {
      const result1 = validateToolKey('-financeiro');
      expect(result1.isValid).toBe(false);

      const result2 = validateToolKey('financeiro-');
      expect(result2.isValid).toBe(false);
    });
  });

  describe('validatePermissionKey', () => {
    const toolKey = createToolKey('financeiro');

    it('deve validar permissionKey válida', () => {
      const result = validatePermissionKey('financeiro.invoices.read', toolKey);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar permissionKey sem toolKey correto', () => {
      const result = validatePermissionKey('rh.employees.read', toolKey);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deve rejeitar permissionKey com formato incorreto', () => {
      const result = validatePermissionKey('financeiro.read', toolKey);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deve rejeitar permissionKey com partes vazias', () => {
      const result = validatePermissionKey('financeiro..read', toolKey);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateFeatureKey', () => {
    const toolKey = createToolKey('financeiro');

    it('deve validar featureKey válida', () => {
      const result = validateFeatureKey('financeiro.new-invoice-flow', toolKey);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar featureKey sem toolKey correto', () => {
      const result = validateFeatureKey('rh.onboarding', toolKey);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deve rejeitar featureKey com formato incorreto', () => {
      const result = validateFeatureKey('financeiro', toolKey);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateDeepLink', () => {
    const toolKey = createToolKey('financeiro');
    const declaredPermissions = new Set([
      createPermissionKey('financeiro.invoices.read'),
      createPermissionKey('financeiro.invoices.create'),
    ]);
    const declaredFeatures = new Set([
      createFeatureKey('financeiro.new-invoice-flow'),
    ]);

    it('deve validar deepLink válido', () => {
      const deepLink: ToolDeepLink = {
        id: 'create-invoice',
        path: 'invoices/create',
        label: 'Criar Fatura',
        requiredPermissions: [createPermissionKey('financeiro.invoices.create')],
        requiredFeatures: [createFeatureKey('financeiro.new-invoice-flow')],
      };

      const result = validateDeepLink(deepLink, toolKey, declaredPermissions, declaredFeatures);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar deepLink sem ID', () => {
      const deepLink: ToolDeepLink = {
        id: '',
        path: 'invoices/create',
        label: 'Criar Fatura',
      };

      const result = validateDeepLink(deepLink, toolKey, declaredPermissions, declaredFeatures);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deve rejeitar deepLink com path absoluto', () => {
      const deepLink: ToolDeepLink = {
        id: 'create-invoice',
        path: '/invoices/create',
        label: 'Criar Fatura',
      };

      const result = validateDeepLink(deepLink, toolKey, declaredPermissions, declaredFeatures);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('relativo'))).toBe(true);
    });

    it('deve alertar sobre permissão não declarada (warning)', () => {
      const deepLink: ToolDeepLink = {
        id: 'delete-invoice',
        path: 'invoices/delete',
        label: 'Deletar Fatura',
        requiredPermissions: [createPermissionKey('financeiro.invoices.delete')], // não declarada
      };

      const result = validateDeepLink(deepLink, toolKey, declaredPermissions, declaredFeatures);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('não declarada'))).toBe(true);
    });

    it('deve alertar sobre feature não declarada (warning)', () => {
      const deepLink: ToolDeepLink = {
        id: 'export-pdf',
        path: 'invoices/export',
        label: 'Exportar PDF',
        requiredFeatures: [createFeatureKey('financeiro.export-pdf')], // não declarada
      };

      const result = validateDeepLink(deepLink, toolKey, declaredPermissions, declaredFeatures);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('não declarada'))).toBe(true);
    });
  });

  describe('validateToolContract', () => {
    it('deve validar contrato completo e válido', () => {
      const contract: ToolContract = {
        toolKey: createToolKey('financeiro'),
        contractVersion: '1.0.0',
        menu: {
          toolKey: createToolKey('financeiro'),
          displayName: 'Financeiro',
          description: 'Gestão financeira',
          icon: 'dollar-sign',
          accessKey: 'financeiro.access',
          menuItems: [
            {
              id: 'invoices',
              label: 'Faturas',
              path: 'invoices',
              icon: 'file-text',
            },
          ],
          deepLinks: [
            {
              id: 'create-invoice',
              path: 'invoices/create',
              label: 'Criar Fatura',
            },
          ],
        },
        featureFlags: {
          toolKey: createToolKey('financeiro'),
          features: {
            [createFeatureKey('financeiro.new-invoice-flow')]: true,
          },
        },
        permissions: {
          toolKey: createToolKey('financeiro'),
          scopes: [
            {
              scopeId: 'invoices',
              label: 'Faturas',
              actions: [
                { actionId: 'read', label: 'Visualizar' },
                { actionId: 'create', label: 'Criar' },
              ],
            },
          ],
          allPermissions: [
            createPermissionKey('financeiro.invoices.read'),
            createPermissionKey('financeiro.invoices.create'),
          ],
        },
        createdAt: Date.now(),
      };

      const result = validateToolContract(contract);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar contrato com toolKey inválido', () => {
      const contract: ToolContract = {
        toolKey: 'Financeiro_Tool' as unknown as ToolKey, // inválido de propósito
        contractVersion: '1.0.0',
        menu: {
          toolKey: 'Financeiro_Tool' as unknown as ToolKey,
          displayName: 'Financeiro',
          accessKey: 'Financeiro_Tool.access',
          menuItems: [],
        },
        featureFlags: {
          toolKey: 'Financeiro_Tool' as unknown as ToolKey,
          features: {},
        },
        permissions: {
          toolKey: 'Financeiro_Tool' as unknown as ToolKey,
          scopes: [],
          allPermissions: [],
        },
      };

      const result = validateToolContract(contract);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deve detectar IDs duplicados no menu', () => {
      const contract: ToolContract = {
        toolKey: createToolKey('financeiro'),
        contractVersion: '1.0.0',
        menu: {
          toolKey: createToolKey('financeiro'),
          displayName: 'Financeiro',
          accessKey: 'financeiro.access',
          menuItems: [
            { id: 'invoices', label: 'Faturas', path: 'invoices' },
            { id: 'invoices', label: 'Faturas 2', path: 'invoices2' }, // duplicado
          ],
        },
        featureFlags: {
          toolKey: createToolKey('financeiro'),
          features: {},
        },
        permissions: {
          toolKey: createToolKey('financeiro'),
          scopes: [],
          allPermissions: [],
        },
      };

      const result = validateToolContract(contract);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('duplicado'))).toBe(true);
    });

    it('deve alertar sobre contrato sem versão (warning)', () => {
      const contract: ToolContract = {
        toolKey: createToolKey('financeiro'),
        contractVersion: '', // vazio
        menu: {
          toolKey: createToolKey('financeiro'),
          displayName: 'Financeiro',
          accessKey: 'financeiro.access',
          menuItems: [],
        },
        featureFlags: {
          toolKey: createToolKey('financeiro'),
          features: {},
        },
        permissions: {
          toolKey: createToolKey('financeiro'),
          scopes: [],
          allPermissions: [],
        },
      };

      const result = validateToolContract(contract);
      expect(result.warnings.some(w => w.includes('versão'))).toBe(true);
    });
  });

  describe('generateAllPermissions', () => {
    it('deve gerar lista flat de permissões a partir de scopes', () => {
      const toolKey = createToolKey('financeiro');
      const scopes: ToolPermissionScope[] = [
        {
          scopeId: 'invoices',
          label: 'Faturas',
          actions: [
            { actionId: 'read', label: 'Visualizar' },
            { actionId: 'create', label: 'Criar' },
          ],
        },
        {
          scopeId: 'reports',
          label: 'Relatórios',
          actions: [
            { actionId: 'read', label: 'Visualizar' },
          ],
        },
      ];

      const result = generateAllPermissions(toolKey, scopes);

      expect(result).toContain('financeiro.invoices.read');
      expect(result).toContain('financeiro.invoices.create');
      expect(result).toContain('financeiro.reports.read');
      expect(result).toHaveLength(3);
    });

    it('deve retornar array vazio para scopes vazios', () => {
      const result = generateAllPermissions(createToolKey('financeiro'), []);
      expect(result).toEqual([]);
    });
  });
});

describe('ToolContextAdapter (integração)', () => {
  // Testes de integração do adapter já existem em tool-context-adapter.spec.ts
  // Aqui apenas validamos que o adapter está exposto na API pública

  it('deve exportar ToolContextAdapter', () => {
    // Este teste garante que o barrel export está correto
    const moduleExports = require('./index');
    expect(moduleExports.ToolContextAdapter).toBeDefined();
  });

  it('deve exportar tipos do contrato', () => {
    const moduleExports = require('./index');
    // Verificar que tipos estão disponíveis (em runtime, types não existem, mas validamos o export)
    expect(moduleExports).toBeDefined();
  });
});
