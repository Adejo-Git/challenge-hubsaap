export default {
  displayName: 'tool-data-access-sdk',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'jsdom',
  // OVERRIDE NECESSÁRIO (F-001): O preset compartilhado não transforma .mjs corretamente devido a limitações
  // Jest +  Angular ESM (fesm2022). Sem esses overrides, setupZoneTestEnv falha ao importar @angular/core.
  // Documentado para revisão em conjunto com ajustes futuros no preset raiz.
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: String.raw`\.(html|svg)$`,
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@angular|rxjs|zone\\.js|jest-preset-angular)/)'],
  coverageDirectory: '../../coverage/libs/tool-data-access-sdk',
};
