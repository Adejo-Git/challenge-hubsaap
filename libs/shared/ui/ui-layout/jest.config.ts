export default {
  displayName: 'ui-layout',
  preset: '../../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/../../../../apps/shell/src/test-setup.ts'],
  coverageDirectory: '../../../../coverage/libs/shared/ui/ui-layout',
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
};
