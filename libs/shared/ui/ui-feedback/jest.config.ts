export default {
  displayName: 'ui-feedback',
  preset: '../../../../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test-setup.ts'],
  coverageDirectory: '../../../../coverage/libs/shared/ui/ui-feedback',
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
  moduleNameMapper: {
    '^@hub/ui-icons-assets$': '<rootDir>/../ui-icons-assets/index.ts',
  },
  testMatch: [
    '<rootDir>/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/**/*(*.)@(spec|test).[jt]s?(x)',
    '<rootDir>/../ui-error-page-component/**/*(*.)@(spec|test).[jt]s?(x)',
  ],
};
