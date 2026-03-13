type StoryFn = (...args: unknown[]) => unknown;

/**
 * Aplica um frame/layout neutro para previews (barra superior fictícia + padding).
 */
export const withLayout = (Story: StoryFn) => {
  const frame = document.createElement('div');
  frame.style.background = '#f6f7f9';
  frame.style.minHeight = '140px';
  frame.style.padding = '20px';
  frame.style.borderRadius = '6px';

  const header = document.createElement('div');
  header.style.height = '32px';
  header.style.marginBottom = '12px';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.gap = '8px';
  header.innerText = 'Preview — Hub Saap';
  header.style.color = '#333';
  header.style.fontSize = '12px';

  frame.appendChild(header);

  const storyEl = Story();
  if (storyEl instanceof HTMLElement) {
    frame.appendChild(storyEl);
  } else {
    const placeholder = document.createElement('div');
    placeholder.innerText = 'Story rendered';
    frame.appendChild(placeholder);
  }

  return frame;
};

export default withLayout;
