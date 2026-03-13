// Minimal Jest setup for http-base tests. We avoid depending on jest-preset-angular here
// but still provide TextEncoder/TextDecoder globals.
/* eslint-disable @typescript-eslint/no-var-requires */
try {
  // Try to load jest-preset-angular setup if available
  // eslint-disable-next-line global-require
  require('jest-preset-angular/setup-jest');
} catch (e) {
  // continue without preset
  // eslint-disable-next-line no-console
  console.warn('jest-preset-angular not available for http-base; continuing without it.');
}

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Minimal jasmine shim for jasmine.createSpyObj used in some tests
if (typeof global.jasmine === 'undefined') {
  global.jasmine = {
    createSpyObj: (name, methods) => {
      const obj = {};
      methods.forEach((m) => { obj[m] = jest.fn(); });
      return obj;
    },
  };
}

// Provide a global fail helper similar to Jasmine's fail
if (typeof global.fail === 'undefined') {
  global.fail = (msg) => { throw new Error(msg); };
}

// Try to initialize Angular TestBed environment (approximation of jest-preset-angular)
try {
  // zone.js testing is required for TestBed
  try { require('zone.js'); } catch (zBaseErr) { /* ignore if not present */ }
  try { require('zone.js/testing'); } catch (zErr) { /* ignore if not present */ }

  const ngTesting = require('@angular/core/testing');
  const platform = require('@angular/platform-browser-dynamic/testing');
  if (ngTesting && platform) {
    ngTesting.TestBed.initTestEnvironment(
      platform.BrowserDynamicTestingModule,
      platform.platformBrowserDynamicTesting(),
    );
  }
} catch (initErr) {
  // If initialization fails, tests that depend on TestBed will error out later.
  // eslint-disable-next-line no-console
  console.warn('Could not initialize Angular TestBed in http-base setup:', initErr && initErr.message);
}
