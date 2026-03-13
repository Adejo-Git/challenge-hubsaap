const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../../../tsconfig.base.json');

module.exports = {
  displayName: 'observability-data-access',
  preset: '../../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../../../../' }),
  moduleFileExtensions: ['ts', 'js', 'html', 'mjs'],
  coverageDirectory: '<rootDir>/../../../../coverage/libs/access/observability/data-access',
};
