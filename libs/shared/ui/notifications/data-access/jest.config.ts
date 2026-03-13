export default {
  displayName: 'notifications-data-access',
  // adjust preset to reach workspace root from this deeper folder
  preset: '../../../../../jest.preset.js',
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
  transformIgnorePatterns: [String.raw`node_modules/(?!(@angular|rxjs|zone\\.js|jest-preset-angular)/)`],
  moduleFileExtensions: ['ts', 'js', 'html', 'mjs'],
  coverageDirectory: '../../coverage/libs/notifications-data-access',
};
