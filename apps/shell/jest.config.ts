const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../tsconfig.base.json');

module.exports = {
  displayName: 'shell',
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/shell',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: ['node_modules/(?!(@angular|rxjs|zone\\.js|jest-preset-angular)/)'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/**/*(*.)@(spec|test).[jt]s?(x)',
  ],
  moduleNameMapper: Object.assign({}, pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../../' }), {
     '^@hub/access-decision$': '<rootDir>/../../libs/access/access-decision/src/lib/index.ts',
     '^@hub/access-layer/decision$': '<rootDir>/../../libs/access/access-layer/src/lib/decision/access-decision.service.ts',
     '^@hub/access-layer/flags$': '<rootDir>/../../libs/access/access-layer/src/lib/flags/index.ts',
     '^@hub/access-layer$': '<rootDir>/../../libs/access/access-layer/src/index.ts',
     '^@hub/observability/data-access$': '<rootDir>/../../libs/access/observability/data-access/src/index.ts',
     '^@hub/notifications/data-access$': '<rootDir>/../../libs/shared/ui/notifications/data-access/src/index.ts',
   }),
};
