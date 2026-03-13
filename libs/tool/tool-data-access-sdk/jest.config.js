/* eslint-env node */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../../tsconfig.base.json');

module.exports = {
  displayName: 'tool-data-access-sdk',
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
  coverageDirectory: '../../../coverage/libs/tool-data-access-sdk',
};
