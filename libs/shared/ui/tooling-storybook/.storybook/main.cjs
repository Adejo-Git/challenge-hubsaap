// Minimal JS Storybook main to log resolved config and avoid TS loading issues
const hubStorybookPreset = {
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-interactions'],
  framework: { name: '@storybook/angular', options: {} },
  stories: ['../**/*.stories.@(ts|tsx|js|jsx)'],
  typescript: { check: false }
};

const main = Object.assign({}, hubStorybookPreset, {
  // keep relative patterns so Storybook resolves them correctly
  stories: Array.isArray(hubStorybookPreset.stories) && hubStorybookPreset.stories.length
    ? hubStorybookPreset.stories
    : ['../src/lib/**/*.stories.@(ts|tsx|js|jsx)'],
  staticDirs: Array.isArray(hubStorybookPreset.staticDirs) ? hubStorybookPreset.staticDirs : []
});

// Debug log
console.log('[tooling-storybook::main.cjs] stories:', main.stories);
console.log('[tooling-storybook::main.cjs] staticDirs:', main.staticDirs);
console.log('[tooling-storybook::main.cjs] addons:', main.addons);
console.log('[tooling-storybook::main.cjs] framework:', main.framework);

module.exports = main;
