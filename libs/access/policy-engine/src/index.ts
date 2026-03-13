/**
 * @file index.ts
 * @description Public API for policy-engine library.
 * 
 * Exports:
 * - Models and types
 * - Service
 * - Utilities
 * - Errors
 * - Built-in policies (for reference/testing)
 */

// Models & Types
export * from './lib/policy-engine.model';

// Service
export * from './lib/policy-engine.service';

// Utilities
export * from './lib/policy-engine.util';

// Errors
export * from './lib/policy-engine.errors';

// Built-in Policies (for reference/extension)
export * from './lib/policies';
