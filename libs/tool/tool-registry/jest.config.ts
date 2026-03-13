const path = require('path');

module.exports = {
  displayName: 'tool-registry',
  preset: require.resolve(path.resolve(__dirname, '../../../jest.preset.js')),
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/libs/tool-registry',
  transform: {
    '^.+\\.[tj]s$': 'ts-jest',
  },
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'js', 'html'],
  testMatch: [
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.spec.js',
  ],
};
