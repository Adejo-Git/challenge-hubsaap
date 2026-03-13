/**
 * Preset central do Storybook para o Hub-Saap
 * Fornece addons e defaults mínimos. Este arquivo é consumido por libs via import do preset.
 */
export const hubStorybookPreset = {
  addons: [
    '@storybook/addon-a11y'
  ],
  framework: {
    name: '@storybook/angular',
    options: {}
  },
  stories: ['../**/*.stories.@(ts|tsx|js|jsx)'],
  typescript: {
    check: false,
  }
};

export default hubStorybookPreset;
