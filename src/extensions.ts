import { Node, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

// A variable placeholder, e.g. {{ name }}
export const Field = Node.create({
  name: 'field', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes() { return { key: { default: '' } }; },
  parseHTML() {
    return [{ tag: 'span[data-field]', getAttrs: (el) => ({ key: (el as HTMLElement).getAttribute('data-field') }) }];
  },
  renderHTML({ node }) {
    return ['span', { 'data-field': node.attrs.key, class: 'field' }, `{{ ${node.attrs.key} }}`];
  },
});

// Per-paragraph direction so Arabic and Latin paragraphs each align correctly
export const BidiAuto = Extension.create({
  name: 'bidiAuto',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading', 'listItem'],
      attributes: { dir: { default: 'auto', renderHTML: () => ({ dir: 'auto' }), parseHTML: () => 'auto' } },
    }];
  },
});

export const extensions = [StarterKit, Field, BidiAuto];
