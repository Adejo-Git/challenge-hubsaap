import { pathsToModuleNameMapper } from 'ts-jest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const currentDir = dirname(__filename);
const tsconfigPath = resolve(currentDir, '../../../tsconfig.base.json');
let compilerOptions = {};
try {
  const raw = readFileSync(tsconfigPath, 'utf8');
  const parsed = JSON.parse(raw);
  compilerOptions = parsed.compilerOptions || {};
} catch {
  // ignore
}

export default {
  displayName: 'feature-flags',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: [resolve(currentDir, 'src', 'test-setup.ts')],
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
  transformIgnorePatterns: [String.raw`node_modules/(?!(@angular|rxjs|zone\\.js|jest-preset-angular)/)`],
  moduleFileExtensions: ['ts', 'js', 'html', 'mjs'],
  coverageDirectory: '<rootDir>/../../../coverage/libs/access/feature-flags',
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../../../' }),
};
