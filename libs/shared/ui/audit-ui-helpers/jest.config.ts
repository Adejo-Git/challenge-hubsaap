import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const currentDir = dirname(__filename);
const tsconfigPath = resolve(currentDir, '../../../../tsconfig.base.json');

let compilerOptions = {};
try {
  const raw = readFileSync(tsconfigPath, 'utf8');
  const parsed = JSON.parse(raw);
  compilerOptions = parsed.compilerOptions || {};
} catch {
  compilerOptions = {};
}

export default {
  displayName: 'audit-ui-helpers',
  // match the working ui-* libs preset style
  preset: '../../../../jest.preset.js',
  // use root-relative coverage path like the CJS variant
  coverageDirectory: '<rootDir>/../../../../coverage/libs/shared/ui/audit-ui-helpers',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
  // Map tsconfig paths to jest moduleNameMapper with prefix that points to the workspace root (root-relative)
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../../../../' }),
};
