import { renderButton } from './button';

describe('renderButton', () => {
  it('renders a button element with given label', () => {
    const el = renderButton('Test');
    expect(el).toBeDefined();
    expect(el.tagName.toLowerCase()).toBe('button');
    expect(el.textContent).toBe('Test');
  });
});
