/**
 * @file test-setup.ts
 * @description Test setup for policy-engine library.
 * 
 * Configures Jest environment and global mocks.
 */

import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Mock console.error to avoid noise in tests (unless explicitly needed)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};
