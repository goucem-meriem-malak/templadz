export type Doc = { type: string; content?: Doc[]; attrs?: Record<string, any>; text?: string };

export const emptyDoc: Doc = { type: 'doc', content: [{ type: 'paragraph' }] };

export function extractFields(doc: Doc): string[] {
  const out: string[] = [];
  const walk = (n: Doc) => {
    if (n.type === 'field' && n.attrs?.key && !out.includes(n.attrs.key)) out.push(n.attrs.key);
    n.content?.forEach(walk);
  };
  walk(doc);
  return out;
}

export const slug = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_]/gu, '');

// CSV with quotes; auto-detects ';' (common with French/Algerian Excel) vs ','
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/)[0] ?? '';
  const d = first.split(';').length > first.split(',').length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = ''; rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export const PDF_CSS = `
@page { size: A4; margin: 20mm; }
body { font-family: "Segoe UI","Noto Sans Arabic","Noto Sans",Tahoma,sans-serif; font-size: 12pt; color: #111; }
h1 { font-size: 22pt; } p { margin: 0 0 8pt; }`;

export const wrapHtml = (body: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${PDF_CSS}</style></head><body>${body}</body></html>`;
