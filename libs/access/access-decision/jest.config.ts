module.exports = {
  displayName: 'access-decision',
  // moved under libs/access/access-decision -> preset is three levels up
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../../coverage/libs/access/access-decision',
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[tj]s?(x)'
  ],
};
