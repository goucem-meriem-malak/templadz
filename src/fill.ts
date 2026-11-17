import { generateHTML } from '@tiptap/html';
import { extensions } from './extensions';
import type { Doc } from './lib';

// Values are inserted with textContent, never as HTML
export function fillHtml(doc: Doc, values: Record<string, string>): string {
  const html = generateHTML(doc as any, extensions);
  const dom = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  dom.querySelectorAll('span[data-field]').forEach((el) => {
    el.textContent = values[el.getAttribute('data-field') || ''] ?? '';
    el.removeAttribute('class');
  });
  return dom.body.innerHTML;
}
