/**
 * Utilitários leves para o preset Storybook
 */
export function registerIcons(registerFn?: (icons: unknown[]) => void) {
  // noop: consumers podem passar função que registra ícones no runtime
  if (typeof registerFn === 'function') {
    try {
      // try to load icons from a shared icons lib if available
      let icons: unknown[] = [];
      try {
        // prefer package @hub/ui-icons-assets or ui-icons-assets
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pkg = require('@hub/ui-icons-assets');
        icons = pkg?.icons || [];
      } catch {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const alt = require('ui-icons-assets');
          icons = alt?.icons || [];
        } catch {
          icons = [];
        }
      }
      registerFn(icons);
    } catch {
      // ignore
    }
  }
}

export function loadAssets() {
  // Retorna lista de assets default (pode ser sobrescrito)
  // try to load tokens/assets from possible libs; fallbacks are empty
  const assets = {
    fonts: [] as string[],
    icons: [] as string[],
  };
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const theme = require('@hub/ui-tokens');
    if (theme?.fonts) assets.fonts = theme.fonts;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const alt = require('ui-tokens');
      if (alt?.fonts) assets.fonts = alt.fonts;
    } catch {
      // noop
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const icons = require('@hub/ui-icons-assets');
    if (icons?.icons) assets.icons = icons.icons;
  } catch {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const alt = require('ui-icons-assets');
      if (alt?.icons) assets.icons = alt.icons;
    } catch {
      // noop
    }
  }

  return assets;
}

export function stableId(prefix = 'sb') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export default { registerIcons, loadAssets, stableId };
