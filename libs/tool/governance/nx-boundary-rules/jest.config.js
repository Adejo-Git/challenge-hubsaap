/* eslint-env node */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../../../tsconfig.base.json');

module.exports = {
  displayName: 'nx-boundary-rules',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../../../../' }),
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  coverageDirectory: '../../../../coverage/libs/tool/governance/nx-boundary-rules',
};

