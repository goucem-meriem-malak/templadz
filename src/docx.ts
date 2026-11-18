import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  ImageRun, PageBreak, LevelFormat, BorderStyle, ShadingType, PageNumber, Header, Footer,
} from 'docx';
import type { Doc } from './lib';

const AR = /[\u0590-\u08FF\uFB50-\uFEFF]/;
const HEADS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
const hex = (c?: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c.slice(1).toUpperCase() : undefined);

function runs(nodes: Doc[] = [], rtl: boolean): any[] {
  const out: any[] = [];
  for (const n of nodes) {
    if (n.type === 'hardBreak') { out.push(new TextRun({ break: 1 })); continue; }
    if (n.type !== 'text' || !n.text) continue;
    const m = (t: string) => n.marks?.find((x) => x.type === t);
    const ts = m('textStyle')?.attrs ?? {};
    const hl = hex(m('highlight')?.attrs?.color) ?? (m('highlight') ? 'FFFF00' : undefined);
    const pt = parseFloat(ts.fontSize);
    out.push(new TextRun({
      text: n.text, bold: !!m('bold'), italics: !!m('italic'), strike: !!m('strike'),
      underline: m('underline') ? {} : undefined, color: hex(ts.color),
      font: ts.fontFamily ? String(ts.fontFamily).split(',')[0].replace(/["']/g, '').trim() : undefined,
      size: pt ? Math.round(pt * 2) : undefined,
      shading: hl ? { type: ShadingType.CLEAR, fill: hl, color: 'auto' } : undefined,
      rightToLeft: rtl || AR.test(n.text),
    }));
  }
  return out;
}

const plain = (n: Doc): string => (n.text ?? '') + (n.content ?? []).map(plain).join('');

function pProps(n: Doc) {
  const dir = n.attrs?.dir;
  const bidi = dir === 'rtl' || (dir !== 'ltr' && AR.test(plain(n)));
  const a = n.attrs?.textAlign;
  // In bidi paragraphs Word treats LEFT as "start", so swap physical left/right
  const alignment =
    a === 'center' ? AlignmentType.CENTER : a === 'justify' ? AlignmentType.JUSTIFIED :
    a === 'right' ? (bidi ? AlignmentType.LEFT : AlignmentType.RIGHT) :
    a === 'left' ? (bidi ? AlignmentType.RIGHT : AlignmentType.LEFT) : AlignmentType.LEFT;
  const lh = parseFloat(n.attrs?.lineHeight);
  return { bidi, props: { alignment, bidirectional: bidi, spacing: { after: 120, ...(lh ? { line: Math.round(lh * 240) } : {}) } } };
}

async function imageRun(src: string): Promise<any | null> {
  try {
    const img = new Image(); img.src = src; await img.decode();
    const k = Math.min(1, 600 / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext('2d')!.drawImage(img, 0, 0);
    const bin = atob(c.toDataURL('image/png').split(',')[1]);
    const data = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return new ImageRun({ type: 'png', data, transformation: { width: Math.round(img.naturalWidth * k), height: Math.round(img.naturalHeight * k) } });
  } catch { return null; }
}

function hfParagraph(text: string) {
  const kids: any[] = [];
  text.split(/(\{\{\s*(?:page|pages|date)\s*\}\})/g).forEach((part) => {
    const k = part.replace(/[{}\s]/g, '');
    if (k === 'page') kids.push(new TextRun({ children: [PageNumber.CURRENT], size: 18 }));
    else if (k === 'pages') kids.push(new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }));
    else if (k === 'date') kids.push(new TextRun({ text: new Date().toLocaleDateString(), size: 18 }));
    else if (part) kids.push(new TextRun({ text: part, size: 18, rightToLeft: AR.test(part) }));
  });
  return new Paragraph({ alignment: AlignmentType.CENTER, children: kids });
}

export async function buildDocx(doc: Doc, header: string, footer: string): Promise<string> {
  const orderedRefs: string[] = [];

  async function blocks(nodes: Doc[] = [], list?: { ref: string; level: number }): Promise<any[]> {
    const out: any[] = [];
    for (const n of nodes) {
      switch (n.type) {
        case 'paragraph': case 'heading': {
          const { bidi, props } = pProps(n);
          out.push(new Paragraph({
            ...props, children: runs(n.content, bidi),
            heading: n.type === 'heading' ? HEADS[(n.attrs?.level ?? 1) - 1] : undefined,
            numbering: list ? { reference: list.ref, level: list.level } : undefined,
          }));
          break;
        }
        case 'bulletList': case 'orderedList': {
          const ref = n.type === 'bulletList' ? 'bullet' : (orderedRefs.push('o' + orderedRefs.length), orderedRefs[orderedRefs.length - 1]);
          const level = list ? list.level + 1 : 0;
          for (const li of n.content ?? []) out.push(...(await blocks(li.content, { ref, level })));
          break;
        }
        case 'blockquote': case 'codeBlock':
          out.push(...(await blocks(n.type === 'codeBlock' ? [{ type: 'paragraph', content: n.content }] : n.content)));
          break;
        case 'horizontalRule':
          out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } } }));
          break;
        case 'pageBreak': out.push(new Paragraph({ children: [new PageBreak()] })); break;
        case 'image': {
          const r = await imageRun(n.attrs?.src);
          if (r) out.push(new Paragraph({ children: [r] }));
          break;
        }
        case 'table': {
          const rows: TableRow[] = [];
          for (const tr of n.content ?? []) {
            const cells: TableCell[] = [];
            for (const td of tr.content ?? []) {
              const kids = await blocks(td.content);
              cells.push(new TableCell({
                children: kids.length ? kids : [new Paragraph('')],
                columnSpan: td.attrs?.colspan > 1 ? td.attrs.colspan : undefined,
                shading: td.type === 'tableHeader' ? { type: ShadingType.CLEAR, fill: 'EEEEEE', color: 'auto' } : undefined,
              }));
            }
            rows.push(new TableRow({ children: cells }));
          }
          out.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
          out.push(new Paragraph(''));
          break;
        }
      }
    }
    return out;
  }

  const children = await blocks(doc.content);
  const lvl = (fmt: any, text: (i: number) => string) =>
    [0, 1, 2, 3].map((i) => ({ level: i, format: fmt, text: text(i), alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720 * (i + 1), hanging: 360 } } } }));
  const config = [
    { reference: 'bullet', levels: lvl(LevelFormat.BULLET, () => '•') },
    ...orderedRefs.map((reference) => ({ reference, levels: lvl(LevelFormat.DECIMAL, (i) => `%${i + 1}.`) })),
  ];
  const d = new Document({
    numbering: { config },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
      headers: header ? { default: new Header({ children: [hfParagraph(header)] }) } : undefined,
      footers: footer ? { default: new Footer({ children: [hfParagraph(footer)] }) } : undefined,
      children: children.length ? children : [new Paragraph('')],
    }],
  });
  return Packer.toBase64String(d);
}
