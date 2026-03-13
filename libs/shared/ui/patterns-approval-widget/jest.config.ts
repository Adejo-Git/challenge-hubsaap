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

const autoMapper = pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../../../../' });

export default {
  displayName: 'patterns-approval-widget',
  preset: '../../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '<rootDir>/../../../../coverage/libs/shared/ui/patterns-approval-widget',
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  transformIgnorePatterns: [String.raw`node_modules/(?!(@angular|rxjs|zone\\.js|jest-preset-angular)/)`],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  testMatch: [
    '<rootDir>/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/**/*(*.)@(spec|test).[jt]s?(x)',
  ],
  // merge auto-generated mapper with explicit entries
  moduleNameMapper: {
    '^@hub/shared/ui-layout$': '<rootDir>/../../../../libs/shared/ui/ui-layout/index.ts',
    ...(autoMapper || {}),
  },
};
