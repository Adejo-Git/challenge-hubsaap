/* eslint-env node */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../../tsconfig.base.json');

module.exports = {
  displayName: 'tool-contract',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'jsdom',
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
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../../../' }),
  moduleFileExtensions: ['ts', 'js', 'html', 'mjs'],
  coverageDirectory: '../../../coverage/libs/tool-contract',
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
