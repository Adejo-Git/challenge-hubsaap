const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('../../../tsconfig.base.json');

module.exports = {
  displayName: 'http-base',
  preset: '../../../jest.preset.js',
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
  coverageDirectory: '../../../coverage/libs/access/http-base',
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
