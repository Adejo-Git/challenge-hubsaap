const nxPreset = require('@nx/jest/preset').default;
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.base.json');

// Extend the Nx Jest preset to better handle ESM packages (Angular fesm2022)
module.exports = {
	preset: 'jest-preset-angular',
	...nxPreset,
	testEnvironment: 'jsdom',

	moduleNameMapper: {
		...(nxPreset.moduleNameMapper ?? {}),
		...pathsToModuleNameMapper(compilerOptions.paths || {}, { prefix: '<rootDir>/../..' + '/' }),
	},

	// CRITICAL FIX: Transform ALL .mjs files in node_modules (no ignore pattern for .mjs)
	// This allows Angular ESM packages to be transformed by babel-jest
	  transformIgnorePatterns: [
    'node_modules/(?!(@angular|rxjs|zone\\.js|jest-preset-angular)/)',
 	 ],

	// Ensure .mjs files are recognized by Jest module resolution
	moduleFileExtensions: Array.from(new Set([...(nxPreset.moduleFileExtensions || []), 'mjs'])),

	// Use jest-preset-angular transformer for TypeScript and Angular files (handles .mjs internally)
	// and babel-jest specifically for standalone .mjs files in node_modules
	transform: {
		// .mjs files: use babel-jest to convert ESM -> CJS
		'^.+\\.mjs$': 'babel-jest',
		// TypeScript and Angular files: use jest-preset-angular transformer
		'^.+\\.(ts|tsx|js|html)$': [
			'jest-preset-angular',
			{
				tsconfig: '<rootDir>/tsconfig.spec.json',
				stringifyContentPathRegex: '\\.(html|svg)$',
			},
		],
	},

	globals: Object.assign({}, nxPreset.globals || {}, {
		'ts-jest': {
			tsconfig: 'tsconfig.spec.json',
			isolatedModules: false,
		},
	}),

	// IMPORTANT:
	// Do NOT set `setupFilesAfterEnv` here: `<rootDir>` is per-project, and most libs
	// won't have `<rootDir>/setup-jest.ts`. Each project should set its own.
};
