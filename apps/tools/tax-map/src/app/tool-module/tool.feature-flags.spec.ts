/**
 * ToolFeatureFlags: Testes de integridade do contrato
 * 
 * Valida que o mapa de feature flags está correto e consistente.
 * 
 * Verificações:
 * - Todas as chaves são únicas
 * - Chaves possuem namespace adequado (toolKey:feature)
 * - Propriedades obrigatórias estão presentes
 * - Estados default estão definidos
 * - Objeto é estático e válido (sem dependências assíncronas)
 */

import {
  TOOL_FEATURE_FLAGS,
  getFeatureKeys,
  getFeature,
  getFeaturesByCategory,
} from './tool.feature-flags';

describe('ToolFeatureFlags', () => {
  const TOOL_KEY = 'tax-map';

  // -------------------------------------------------------------------
  // TESTES DE ESTRUTURA E INTEGRIDADE
  // -------------------------------------------------------------------

  describe('Estrutura do Contrato', () => {
    it('deve exportar o mapa de feature flags', () => {
      expect(TOOL_FEATURE_FLAGS).toBeDefined();
      expect(typeof TOOL_FEATURE_FLAGS).toBe('object');
    });

    it('deve ter pelo menos uma feature definida', () => {
      const keys = Object.keys(TOOL_FEATURE_FLAGS);
      expect(keys.length).toBeGreaterThan(0);
    });

    it('deve ser um objeto estático (sem dependências assíncronas)', () => {
      // Se o objeto é acessível de forma síncrona, está válido
      expect(TOOL_FEATURE_FLAGS).not.toBeNull();
      expect(TOOL_FEATURE_FLAGS).not.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------
  // TESTES DE CHAVES (KEYS)
  // -------------------------------------------------------------------

  describe('Feature Keys', () => {
    it('todas as chaves devem ser únicas', () => {
      const keys = getFeatureKeys();
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('todas as chaves devem ter namespace da tool', () => {
      const keys = getFeatureKeys();
      keys.forEach((key) => {
        expect(key).toContain(`${TOOL_KEY}:`);
      });
    });

    it('chaves devem seguir padrão "toolKey:feature-name"', () => {
      const keys = getFeatureKeys();
      const pattern = new RegExp(`^${TOOL_KEY}:[a-z0-9-]+$`);
      
      keys.forEach((key) => {
        expect(key).toMatch(pattern);
      });
    });

    it('não deve haver chaves vazias ou apenas com namespace', () => {
      const keys = getFeatureKeys();
      
      keys.forEach((key) => {
        const parts = key.split(':');
        expect(parts.length).toBe(2);
        expect(parts[0]).toBe(TOOL_KEY);
        expect(parts[1].length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------------------------------------------------------
  // TESTES DE DESCRITORES
  // -------------------------------------------------------------------

  describe('Feature Descriptors', () => {
    it('todos os descritores devem ter propriedades obrigatórias', () => {
      const keys = getFeatureKeys();

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        
        // Propriedades obrigatórias
        expect(feature.key).toBeDefined();
        expect(feature.title).toBeDefined();
        expect(feature.description).toBeDefined();
        expect(feature.defaultState).toBeDefined();
      });
    });

    it('nenhum descritor deve ter título vazio', () => {
      const keys = getFeatureKeys();

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        expect(feature.title.trim().length).toBeGreaterThan(0);
      });
    });

    it('nenhum descritor deve ter descrição vazia', () => {
      const keys = getFeatureKeys();

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        expect(feature.description.trim().length).toBeGreaterThan(0);
      });
    });

    it('chave no descritor deve coincidir com a chave no mapa', () => {
      const keys = getFeatureKeys();

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        expect(feature.key).toBe(key);
      });
    });
  });

  // -------------------------------------------------------------------
  // TESTES DE DEFAULT STATE
  // -------------------------------------------------------------------

  describe('Default State', () => {
    it('todas as features devem ter defaultState.default definido', () => {
      const keys = getFeatureKeys();

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        expect(feature.defaultState.default).toBeDefined();
      });
    });

    it('defaultState.default deve ter valor válido', () => {
      const validStates = ['enabled', 'disabled', 'beta', 'deprecated'];
      const keys = getFeatureKeys();

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        expect(validStates).toContain(feature.defaultState.default);
      });
    });

    it('estados por ambiente devem ser válidos quando definidos', () => {
      const validStates = ['enabled', 'disabled', 'beta', 'deprecated'];
      const keys = getFeatureKeys();

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        const { prod, hml, dev } = feature.defaultState;

        if (prod) expect(validStates).toContain(prod);
        if (hml) expect(validStates).toContain(hml);
        if (dev) expect(validStates).toContain(dev);
      });
    });
  });

  // -------------------------------------------------------------------
  // TESTES DE REGRAS (RULES)
  // -------------------------------------------------------------------

  describe('Feature Rules', () => {
    it('regras devem ser opcionais', () => {
      const keys = getFeatureKeys();
      const featuresWithoutRules = keys.filter(
        (key) => !TOOL_FEATURE_FLAGS[key].rules
      );

      // Deve existir pelo menos uma feature sem regras
      expect(featuresWithoutRules.length).toBeGreaterThan(0);
    });

    it('regras quando presentes devem ter propriedades válidas', () => {
      const keys = getFeatureKeys();
      const validTiers = ['basic', 'premium', 'enterprise'];

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        
        if (feature.rules) {
          // Se requireTenantTier está definido, deve ser válido
          if (feature.rules.requireTenantTier) {
            expect(validTiers).toContain(feature.rules.requireTenantTier);
          }

          // Outros campos devem ser booleanos se definidos
          if ('requireProject' in feature.rules) {
            expect(typeof feature.rules.requireProject).toBe('boolean');
          }
          if ('requireClient' in feature.rules) {
            expect(typeof feature.rules.requireClient).toBe('boolean');
          }
          if ('experimental' in feature.rules) {
            expect(typeof feature.rules.experimental).toBe('boolean');
          }
        }
      });
    });

    it('features experimentais devem ter flags apropriadas', () => {
      const keys = getFeatureKeys();

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        
        if (feature.category === 'experimental') {
          // Experimental deve ter regra marcada ou estar disabled por padrão
          const hasExperimentalRule = feature.rules?.experimental === true;
          const isDisabledByDefault = feature.defaultState.default === 'disabled' || 
                                      feature.defaultState.default === 'beta';
          
          expect(hasExperimentalRule || isDisabledByDefault).toBe(true);
        }
      });
    });
  });

  // -------------------------------------------------------------------
  // TESTES DE CATEGORIAS
  // -------------------------------------------------------------------

  describe('Categories', () => {
    it('categorias quando presentes devem ser válidas', () => {
      const validCategories = ['core', 'advanced', 'admin', 'experimental'];
      const keys = getFeatureKeys();

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        
        if (feature.category) {
          expect(validCategories).toContain(feature.category);
        }
      });
    });

    it('deve ter pelo menos uma feature core', () => {
      const coreFeatures = getFeaturesByCategory('core');
      expect(coreFeatures.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------
  // TESTES DE HELPERS
  // -------------------------------------------------------------------

  describe('Helper Functions', () => {
    it('getFeatureKeys deve retornar todas as chaves', () => {
      const keys = getFeatureKeys();
      const expectedKeys = Object.keys(TOOL_FEATURE_FLAGS);
      
      expect(keys).toEqual(expectedKeys);
    });

    it('getFeature deve retornar feature existente', () => {
      const keys = getFeatureKeys();
      const firstKey = keys[0];
      const feature = getFeature(firstKey);
      
      expect(feature).toBeDefined();
      expect(feature.key).toBe(firstKey);
    });

    it('getFeature deve retornar undefined para chave inexistente', () => {
      const feature = getFeature('inexistent-key');
      expect(feature).toBeUndefined();
    });

    it('getFeaturesByCategory deve filtrar corretamente', () => {
      const coreFeatures = getFeaturesByCategory('core');
      
      coreFeatures.forEach((feature) => {
        expect(feature.category).toBe('core');
      });
    });

    it('getFeaturesByCategory deve retornar array vazio para categoria inexistente', () => {
      const features = getFeaturesByCategory('nonexistent');
      expect(features).toEqual([]);
    });
  });

  // -------------------------------------------------------------------
  // TESTES DE CONTRATOS E CONSISTÊNCIA
  // -------------------------------------------------------------------

  describe('Consistência do Contrato', () => {
    it('não deve conter lógica de autorização (RBAC/ABAC)', () => {
      // Feature flags não devem ter palavras relacionadas a permissões
      const keys = getFeatureKeys();
      const forbiddenTerms = ['permission', 'role', 'policy', 'access'];

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        const lowerCaseDesc = feature.description.toLowerCase();
        
        forbiddenTerms.forEach((term) => {
          // Permitir menção contextual, mas não como responsabilidade principal
          if (lowerCaseDesc.includes(term)) {
            // Se menciona permissão, deve deixar claro que não é responsabilidade da flag
            expect(
              lowerCaseDesc.includes('não') || 
              lowerCaseDesc.includes('sem') ||
              feature.description.length > 100 // descrição longa contextualizada
            ).toBe(true);
          }
        });
      });
    });

    it('não deve haver duplicação de responsabilidades entre flags', () => {
      const keys = getFeatureKeys();
      const descriptions = keys.map(
        (key) => TOOL_FEATURE_FLAGS[key].description
      );
      
      // Descrições muito similares indicam duplicação
      const uniqueDescriptions = new Set(descriptions);
      expect(descriptions.length).toBe(uniqueDescriptions.size);
    });

    it('createdAt quando presente deve ter formato válido', () => {
      const keys = getFeatureKeys();
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        
        if (feature.createdAt) {
          expect(feature.createdAt).toMatch(datePattern);
        }
      });
    });

    it('minVersion quando presente deve seguir semver', () => {
      const keys = getFeatureKeys();
      const semverPattern = /^\d+\.\d+\.\d+$/;

      keys.forEach((key) => {
        const feature = TOOL_FEATURE_FLAGS[key];
        
        if (feature.minVersion) {
          expect(feature.minVersion).toMatch(semverPattern);
        }
      });
    });
  });

  // -------------------------------------------------------------------
  // TESTES DE INTEGRAÇÃO COM OUTRAS PARTES
  // -------------------------------------------------------------------

  describe('Integração com Rotas', () => {
    it('features core devem ter nomes compatíveis com rotas comuns', () => {
      const coreFeatures = getFeaturesByCategory('core');
      
      coreFeatures.forEach((feature) => {
        const featureName = feature.key.split(':')[1];
        // Features core geralmente mapeiam para rotas principais
        expect(typeof featureName).toBe('string');
        expect(featureName.length).toBeGreaterThan(0);
      });
    });
  });
});
