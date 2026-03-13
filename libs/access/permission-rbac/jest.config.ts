import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const currentDir = dirname(__filename);
const tsconfigPath = resolve(currentDir, '../../../tsconfig.base.json');
const raw = readFileSync(tsconfigPath, 'utf8');
const parsed = JSON.parse(raw);
const compilerOptions = parsed.compilerOptions || {};

export default {
  displayName: 'permission-rbac',
  preset: '../../../jest.preset.js',
  testEnvironment: 'jsdom',
  coverageDirectory: '../../../coverage/libs/access/permission-rbac',
  moduleNameMapper: {
    '^@angular/core$': '<rootDir>/../access-layer/src/__mocks__/@angular/core.ts',
    '^@angular/core(.*)$': '<rootDir>/../access-layer/src/__mocks__/@angular/core$1',
    '^@angular/router$': '<rootDir>/../access-layer/src/__mocks__/@angular/router.ts',
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: '<rootDir>/../../../',
    }),
  },
  // Use ts-jest for TypeScript files to avoid pulling Angular testing ESM modules
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }],
  },
  // Remove jest-preset-angular-specific setup which imports Angular testing modules
  setupFilesAfterEnv: [],
  // Keep transformIgnorePatterns empty to allow node_modules transforms when necessary
  transformIgnorePatterns: [],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      isolatedModules: false,
    },
  },
};
