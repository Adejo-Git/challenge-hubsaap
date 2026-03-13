type StoryFn = (...args: unknown[]) => unknown;

interface StoryContext {
  args?: {
    theme?: string;
  };
}

/**
 * Aplica tema básico (light/dark) via classe no wrapper.
 * Integra com `ui-theme` se disponível; caso contrário usa classes CSS simples.
 */
export const withTheme = (Story: StoryFn, context: StoryContext) => {
  // prefer explicit arg `theme` nos stories; default = 'light'
  const theme = (context && context.args && context.args.theme) || 'light';

  const wrapper = document.createElement('div');
  wrapper.className = `hubsb-theme hubsb-theme--${theme}`;
  wrapper.style.padding = '12px';

  // attempt to apply CSS variables from a shared ui-theme if available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const uiTheme = require('@hub/ui-theme');
    if (uiTheme && uiTheme.applyTheme && typeof uiTheme.applyTheme === 'function') {
      try {
        uiTheme.applyTheme(wrapper, theme);
      } catch {
        // ignore apply failures
      }
    }
  } catch {
    // fallback noop — class-based theme remains
  }

  const storyEl = Story();
  if (storyEl instanceof HTMLElement) {
    wrapper.appendChild(storyEl);
    return wrapper;
  }

  // fallback: StoryFn pode retornar fragment/virtual; wrap in container
  const container = document.createElement('div');
  container.appendChild(wrapper);
  return container;
};

export default withTheme;
