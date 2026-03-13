export default {
  displayName: 'auth-interceptor',
  preset: '../../../jest.preset.js',
  coverageDirectory: '../../../coverage/libs/access/auth-interceptor',
  moduleNameMapper: {
    '^@hub/error-model$': '<rootDir>/../../shared/error-model/src/index.ts',
    '^@hub/auth-session$': '<rootDir>/../auth-session/auth-session/src/index.ts',
    '^@hub/observability/data-access$': '<rootDir>/../observability/data-access/src/index.ts',
  },
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/src/**/*.test.ts'],
};
