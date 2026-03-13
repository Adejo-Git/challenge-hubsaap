import type { Config } from 'jest';

const config: Config = {
  displayName: 'tooling-storybook',
  preset: '../../../../jest.preset.js',
  testMatch: ['**/+(*.)+(spec|test).+(ts|js)'],
  testEnvironment: 'jsdom',
};

export default config;
