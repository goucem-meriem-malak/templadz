export type Doc = { type: string; content?: Doc[]; attrs?: Record<string, any>; text?: string; marks?: any[] };
export type Row = Record<string, string>;

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

// Replace field nodes by text. row=null keeps readable placeholders ({{ key }}).
export function fillDoc(doc: Doc, row: Row | null): Doc {
  const walk = (n: Doc): Doc[] => {
    if (n.type === 'field') {
      const text = row ? row[n.attrs?.key] ?? '' : `{{ ${n.attrs?.key} }}`;
      return text ? [{ type: 'text', text }] : [];
    }
    return [n.content ? { ...n, content: n.content.flatMap(walk) } : n];
  };
  return walk(doc)[0];
}

const SAFE_IMG = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/;
// Drop anything that could load remote/local resources (used on every template load/import)
export function sanitizeDoc(doc: Doc): Doc {
  const walk = (n: Doc): Doc[] => {
    if (n.type === 'image' && !SAFE_IMG.test(String(n.attrs?.src || ''))) return [];
    return [n.content ? { ...n, content: n.content.flatMap(walk) } : n];
  };
  return walk(doc)[0] ?? emptyDoc;
}

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

// Quick-batch syntax:  fname[ali; sara; omar] lname[x; y; z] bday[21/11/2001]
// - separator is ';' if the brackets contain one, otherwise ','
// - one value broadcasts to every row; several values must all have the same length
// - fields not mentioned fall back to `defaults` (the single-copy form)
export function parseBracket(text: string, fields: string[], defaults: Row): { rows: Row[]; errors: string[] } {
  const errors: string[] = [];
  const cols: Record<string, string[]> = {};
  const re = /([^\s[\]]+)\s*\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const body = m[2];
    const vals = body.split(body.includes(';') ? ';' : ',').map((s) => s.trim());
    if (vals.length > 1 && vals[vals.length - 1] === '') vals.pop();
    cols[m[1]] = vals;
    if (!fields.includes(m[1])) errors.push('unknown:' + m[1]);
  }
  if (text.replace(re, '').trim()) errors.push('syntax');
  const lens = [...new Set(Object.values(cols).map((v) => v.length).filter((n) => n > 1))];
  if (lens.length > 1) errors.push('length:' + lens.join('/'));
  const n = lens[0] ?? 1;
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) {
    const row: Row = { ...defaults };
    for (const k of Object.keys(cols)) if (fields.includes(k)) row[k] = cols[k].length === 1 ? cols[k][0] : cols[k][i] ?? '';
    rows.push(row);
  }
  return { rows, errors };
}

export const safeName = (s: string) => s.replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100);

// TemplateName_firstValue_secondValue ; duplicates get the row number appended
export function fileLabel(tplName: string, fields: string[], row: Row, idx: number, used: Set<string>): string {
  let base = safeName([tplName, ...fields.slice(0, 2).map((f) => row[f]).filter(Boolean)].join('_')) || 'document';
  if (used.has(base.toLowerCase())) base += '_' + (idx + 1);
  used.add(base.toLowerCase());
  return base;
}

export const PDF_CSS = `
@page { size: A4; margin: 20mm; }
body { font-family: "Segoe UI","Noto Sans Arabic","Noto Sans",Tahoma,sans-serif; font-size: 12pt; color: #111; }
p { margin: 0 0 8pt; } h1 { font-size: 22pt; } h2 { font-size: 17pt; } h3 { font-size: 14pt; }
table { border-collapse: collapse; width: 100%; } td, th { border: 1px solid #999; padding: 4pt 6pt; vertical-align: top; }
th { background: #eee; } img { max-width: 100%; } mark { background: #ff0; }
hr { border: 0; border-top: 1px solid #999; } .page-break { break-after: page; height: 0; }
blockquote { border-inline-start: 3px solid #bbb; margin: 0; padding-inline-start: 10pt; }`;

export const wrapHtml = (body: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>${PDF_CSS}</style></head><body>${body}</body></html>`;
