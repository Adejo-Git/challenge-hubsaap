// Setup for jest-preset-angular and global test environment (optional)
try {
	// jest-preset-angular may be unavailable in some environments; load if present
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	require('jest-preset-angular/setup-jest');
} catch (e) {
	// continue without preset — some tests may still run depending on environment
	// eslint-disable-next-line no-console
	console.warn('jest-preset-angular not available; continuing without it.');
}

// Some globals that libraries may expect
/* eslint-disable @typescript-eslint/no-var-requires */
(global as any).TextEncoder = require('util').TextEncoder;
(global as any).TextDecoder = require('util').TextDecoder;
/* eslint-enable @typescript-eslint/no-var-requires */
