import type { StorybookConfig } from '@storybook/angular';

// Minimal explicit main config to avoid dynamic exports and enable automigrations.
// Kept intentionally simple — adjust per-consumer if needed.
const main: StorybookConfig = {
	addons: ['@storybook/addon-a11y'],
	framework: {
		name: '@storybook/angular',
		options: {}
	},
	stories: ['../**/*.stories.@(ts|tsx|js|jsx)'],
	typescript: { check: false },
	docs: { autodocs: true },
	// default to empty staticDirs to avoid passing undefined into core
	staticDirs: []
};

// eslint-disable-next-line import/no-default-export
export default main;
