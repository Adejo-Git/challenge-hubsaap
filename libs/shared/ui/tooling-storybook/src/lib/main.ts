// Storybook main config (consumidor pode importar o preset ou copiar o bloco relevante)
import { hubStorybookPreset } from './storybook-preset';

// Keep story patterns relative so Storybook can resolve them correctly
const defaultStories = ['../**/*.stories.@(ts|tsx|js|jsx)'];

export const main = {
  ...hubStorybookPreset,
  stories: Array.isArray(hubStorybookPreset.stories) && hubStorybookPreset.stories.length
    ? hubStorybookPreset.stories
    : defaultStories,
  // Avoid referencing non-existent shared asset folders by default.
  // Consumers may extend `staticDirs` in their own Storybook config if needed.
  staticDirs: (() => {
    const preset = hubStorybookPreset as unknown as { staticDirs?: unknown };
    const dirs = preset.staticDirs;
    return Array.isArray(dirs) ? (dirs as string[]) : [];
  })()
};

export default main;
