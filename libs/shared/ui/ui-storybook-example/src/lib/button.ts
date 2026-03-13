export function renderButton(label = 'Button') {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.padding = '8px 12px';
  btn.style.borderRadius = '4px';
  btn.style.border = '1px solid #ccc';
  return btn;
}

export default renderButton;
