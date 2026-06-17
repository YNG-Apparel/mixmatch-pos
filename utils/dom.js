export function createElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export async function loadComponent(selector, url) {
  const element = document.querySelector(selector);
  if (!element) return;
  const response = await fetch(url);
  if (!response.ok) return;
  const html = await response.text();
  element.innerHTML = html;
}
