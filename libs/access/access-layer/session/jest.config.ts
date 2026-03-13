import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const currentDir = dirname(__filename);
const tsconfigPath = resolve(currentDir, '../../../../tsconfig.base.json');
const raw = readFileSync(tsconfigPath, 'utf8');
const parsed = JSON.parse(raw);
const compilerOptions = parsed.compilerOptions || {};

export default {
  displayName: 'access-layer-session',
  preset: '../../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }],
  },
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../../../../' }),
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: ['<rootDir>/src/lib/**/*.spec.ts', '<rootDir>/src/**/*.spec.js'],
  coverageDirectory: '<rootDir>/../../../../coverage/libs/access/access-layer/session',
};
