// JS shim to satisfy tools that look for main.js (keeps parity with main.ts)
module.exports = {
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y', '@storybook/addon-interactions'],
  framework: { name: '@storybook/angular', options: {} },
  stories: ['../**/*.stories.@(ts|tsx|js|jsx)'],
  typescript: { check: false },
  docs: { autodocs: true },
  staticDirs: []
};
// Normalizing wrapper for Storybook main config.
// Loads the real config (TS/JS) then ensures arrays contain only strings
const path = require('path');
let mainConfig;
try {
  // Prefer explicit JS main if present (main.cjs created earlier), else attempt TS main.
  try { mainConfig = require('./main.cjs'); } catch (e) { mainConfig = require('./main'); }
} catch (err) {
  console.error('[tooling-storybook::main.js] failed to load underlying main config:', err && err.stack ? err.stack : err);
  mainConfig = {};
}

function ensureStringArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') return [v];
  return [];
}

const normalized = Object.assign({}, mainConfig, {
  stories: ensureStringArray(mainConfig.stories),
  staticDirs: ensureStringArray(mainConfig.staticDirs),
  addons: ensureStringArray(mainConfig.addons),
  // framework can be an object or string; keep as-is but guard
  framework: mainConfig.framework || undefined,
});

// Extra debug logging to help core errors surface with values
console.log('[tooling-storybook::main.js] normalized stories:', normalized.stories.slice(0, 10));
console.log('[tooling-storybook::main.js] normalized staticDirs:', normalized.staticDirs);
console.log('[tooling-storybook::main.js] normalized addons:', normalized.addons);

module.exports = normalized;
