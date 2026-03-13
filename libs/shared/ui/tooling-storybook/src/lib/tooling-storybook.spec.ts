import preset from './storybook-preset';
import preview from './preview';

describe('tooling-storybook smoke', () => {
  test('storybook preset exports and preview exist', () => {
    expect(preset).toBeDefined();
    expect(typeof preset).toBe('object');
    expect(preview).toBeDefined();
  });
});
