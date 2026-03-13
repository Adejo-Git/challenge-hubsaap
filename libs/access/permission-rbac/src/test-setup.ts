/**
 * @file test-setup.ts
 * @description Setup básico para testes da lib permission-rbac.
 */

// Use a CJS require fallback to avoid Jest ESM parsing issues in some environments.
// Try require first (works in CJS runner); if that fails, use dynamic import for ESM-aware runtimes.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { setupZoneTestEnv } = require('jest-preset-angular/setup-env/zone');
  setupZoneTestEnv();
} catch {
  // dynamic import fallback
  (async () => {
    const mod = await import('jest-preset-angular/setup-env/zone');
    if (mod && typeof mod.setupZoneTestEnv === 'function') {
      mod.setupZoneTestEnv();
    }
  })();
}
