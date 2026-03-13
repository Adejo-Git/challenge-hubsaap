export default {
  displayName: 'auth-session',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/../../../setup-jest.ts'],
  coverageDirectory: '../../../coverage/libs/access/auth-session',
  moduleNameMapper: {
    '^@hub/error-model$': '<rootDir>/../../shared/error-model/src/index.ts'
  },
  testMatch: ['<rootDir>/auth-session/src/**/*.spec.ts']
};
