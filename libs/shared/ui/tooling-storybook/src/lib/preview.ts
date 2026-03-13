import { withTheme } from './decorators/theme.decorator';
import { withLayout } from './decorators/layout.decorator';
import { handlers as defaultHandlers } from './mocks/msw.handlers';
import { loadAssets, registerIcons } from './storybook.util';

// load assets (fonts/icons) when preview is evaluated in Storybook
try {
  const assets = loadAssets();
  if (assets && Array.isArray(assets.fonts) && assets.fonts.length) {
    assets.fonts.forEach((href) => {
      try {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      } catch {
        // ignore
      }
    });
  }

  // register icons into a well-known global or fallback store
  registerIcons((icons) => {
    try {
      const globalTyped = globalThis as unknown as { registerHubIcons?: (icons: unknown) => void; __hub_icons?: unknown };
      if (typeof globalTyped.registerHubIcons === 'function') {
        globalTyped.registerHubIcons(icons);
      } else {
        (globalTyped as { __hub_icons?: unknown }).__hub_icons = icons; // intentionally fallback store (runtime only)
      }
    } catch {
      // noop
    }
  });
} catch {
  // noop when running outside browser or assets not available
}

// Decorators globais aplicados em todas as stories que consumirem este preview
export const decorators = [withTheme, withLayout];

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: { expanded: true },
  a11y: { element: '#root' },
  docs: { inlineStories: false },
  msw: { handlers: defaultHandlers }
};

export default { decorators, parameters };
