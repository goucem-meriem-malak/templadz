import { Node, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';

// Variable placeholder, e.g. {{ name }}
export const Field = Node.create({
  name: 'field', group: 'inline', inline: true, atom: true, selectable: true,
  addAttributes() { return { key: { default: '' } }; },
  parseHTML() { return [{ tag: 'span[data-field]', getAttrs: (el) => ({ key: (el as HTMLElement).getAttribute('data-field') }) }]; },
  renderHTML({ node }) { return ['span', { 'data-field': node.attrs.key, class: 'field' }, `{{ ${node.attrs.key} }}`]; },
});

export const PageBreak = Node.create({
  name: 'pageBreak', group: 'block', atom: true, selectable: true,
  parseHTML() { return [{ tag: 'div[data-page-break]' }]; },
  renderHTML() { return ['div', { 'data-page-break': '1', class: 'page-break' }]; },
  addCommands() { return { setPageBreak: () => ({ commands }: any) => commands.insertContent({ type: 'pageBreak' }) } as any; },
});

// Per-paragraph direction: 'auto' (default), 'ltr' or 'rtl'
export const Direction = Extension.create({
  name: 'direction',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading', 'listItem'],
      attributes: { dir: { default: 'auto', parseHTML: (el) => el.getAttribute('dir') || 'auto', renderHTML: (a) => ({ dir: a.dir || 'auto' }) } },
    }];
  },
});

export const LineHeight = Extension.create({
  name: 'lineHeight',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: { lineHeight: { default: null, parseHTML: (el) => el.style.lineHeight || null, renderHTML: (a) => (a.lineHeight ? { style: `line-height:${a.lineHeight}` } : {}) } },
    }];
  },
});

export const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: { fontSize: { default: null, parseHTML: (el) => el.style.fontSize || null, renderHTML: (a) => (a.fontSize ? { style: `font-size:${a.fontSize}` } : {}) } },
    }];
  },
  addCommands() {
    return { setFontSize: (size: string) => ({ chain }: any) => chain().setMark('textStyle', { fontSize: size }).run() } as any;
  },
});

export const extensions = [
  StarterKit, Underline, TextStyle, Color, FontFamily, FontSize,
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'start' as any }),
  Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
  Image.configure({ allowBase64: true }),
  Field, PageBreak, Direction, LineHeight,
];
