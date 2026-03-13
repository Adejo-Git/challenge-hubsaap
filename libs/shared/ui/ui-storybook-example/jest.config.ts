export default {
  displayName: 'ui-storybook-example',
  preset: '../../../../jest.preset.js',
  testEnvironment: 'jsdom',
  coverageDirectory: '<rootDir>/../../../../coverage/libs/shared/ui/ui-storybook-example',
  transform: {
    '^.+\\.(ts|js)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json'
      }
    ]
  },
  testMatch: [
    '<rootDir>/**/__tests__/**/*.[jt]s?(x)',
    '<rootDir>/**/*(*.)@(spec|test).[jt]s?(x)'
  ]
};
