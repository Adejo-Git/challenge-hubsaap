import hubMain from '../../tooling-storybook/.storybook/main';

export default {
  ...hubMain,
  stories: ['../../**/src/lib/**/*.stories.@(ts|tsx|js|jsx)']
};
