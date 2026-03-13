export default {
  displayName: 'ui-components',
  preset: '../../../../jest.preset.js',
  testEnvironment: 'jsdom',
  coverageDirectory: '../../../../coverage/libs/shared/ui/ui-components',
  transform: {
    '^.+\\.(ts|js)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
  },
  testMatch: [
    '<rootDir>/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/**/*(*.)@(spec|test).[jt]s?(x)',
  ],
};
