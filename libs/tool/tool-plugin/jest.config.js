/* eslint-env node */
module.exports = {
  displayName: 'tool-plugin',
  preset: '../../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  // Transform Angular packages (ESM) and rxjs so Jest can parse imports
  transformIgnorePatterns: ['node_modules/(?!(?:@angular|rxjs)/)'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  coverageDirectory: '<rootDir>/../../coverage/libs/tool/tool-plugin',
};
