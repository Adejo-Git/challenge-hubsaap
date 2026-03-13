const basePreset = require('./jest.preset.js');

module.exports = {
  ...basePreset,
  rootDir: '.',
  testMatch: [
    '<rootDir>/libs/http-telemetry/data-access/src/lib/http-telemetry-interceptor/*.spec.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
};
