import { describe, it, expect } from 'vitest';
import { parseCsv, extractFields, slug, parseBracket, fillDoc, sanitizeDoc, fileLabel } from './lib';

const F = ['fname', 'lname', 'bday'];
describe('parseBracket', () => {
  it('multi rows with broadcast', () => {
    const r = parseBracket('fname[meriem; rayan; jolie] lname[malak;kidra;kolp] bday[21/11/2001]', F, {});
    expect(r.errors).toEqual([]);
    expect(r.rows).toHaveLength(3);
    expect(r.rows[1]).toEqual({ fname: 'rayan', lname: 'kidra', bday: '21/11/2001' });
  });
  it('accepts commas', () => {
    expect(parseBracket('fname[a,b]', F, {}).rows.map((r) => r.fname)).toEqual(['a', 'b']);
  });
  it('flags length mismatch, unknown field and stray text', () => {
    expect(parseBracket('fname[a;b] lname[x;y;z]', F, {}).errors[0]).toMatch(/^length/);
    expect(parseBracket('nope[a]', F, {}).errors).toContain('unknown:nope');
    expect(parseBracket('fname[a] oops', F, {}).errors).toContain('syntax');
  });
  it('uses form values as defaults', () => {
    expect(parseBracket('fname[a;b]', F, { bday: '1' }).rows[0].bday).toBe('1');
  });
});
describe('names and docs', () => {
  it('builds unique file labels', () => {
    const used = new Set<string>();
    expect(fileLabel('Cert', F, { fname: 'a', lname: 'b' }, 0, used)).toBe('Cert_a_b');
    expect(fileLabel('Cert', F, { fname: 'a', lname: 'b' }, 1, used)).toBe('Cert_a_b_2');
  });
  const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'field', attrs: { key: 'name' } }] }] };
  it('fills and keeps placeholders', () => {
    expect(extractFields(doc)).toEqual(['name']);
    expect(fillDoc(doc, { name: 'Ali' }).content![0].content![0].text).toBe('Ali');
    expect(fillDoc(doc, null).content![0].content![0].text).toBe('{{ name }}');
  });
  it('strips unsafe images', () => {
    const d = { type: 'doc', content: [{ type: 'image', attrs: { src: 'http://evil/x.png' } }, { type: 'image', attrs: { src: 'data:image/png;base64,AAAA' } }] };
    expect(sanitizeDoc(d).content).toHaveLength(1);
  });
  it('csv + slug', () => {
    expect(parseCsv('\uFEFFa;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(slug(' Issue Date ')).toBe('issue_date');
  });
});
