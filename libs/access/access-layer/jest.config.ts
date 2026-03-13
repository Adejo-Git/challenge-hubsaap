const { pathsToModuleNameMapper } = require('ts-jest');
const path = require('path');
const { compilerOptions } = require('../../../tsconfig.base.json');

module.exports = {
  displayName: 'access-layer',
  // moved under libs/access/access-layer -> preset path adjusted
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: [],
  coverageDirectory: '../../../coverage/libs/access/access-layer',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      // Use the library's tsconfig.spec.json so jest types and path mappings apply
      tsconfig: path.resolve(__dirname, 'tsconfig.spec.json'),
    }],
  },
  moduleNameMapper: {
    '^@angular/core$': '<rootDir>/src/__mocks__/@angular/core.ts',
    '^@angular/router$': '<rootDir>/src/__mocks__/@angular/router.ts',
    ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/../../..' }),
  },
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'js'],
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.spec.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(@angular|rxjs)/)',
  ],
};
