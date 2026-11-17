import { describe, it, expect } from 'vitest';
import { parseCsv, extractFields, slug } from './lib';

describe('parseCsv', () => {
  it('parses commas, quotes and BOM', () => {
    expect(parseCsv('\uFEFFname,date\n"Doe, J",2026-01-01\n')).toEqual([['name', 'date'], ['Doe, J', '2026-01-01']]);
  });
  it('detects semicolons', () => {
    expect(parseCsv('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('skips blank lines', () => {
    expect(parseCsv('a,b\n\n1,2\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
});
describe('fields', () => {
  it('extracts unique keys in order', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [
      { type: 'field', attrs: { key: 'name' } }, { type: 'field', attrs: { key: 'date' } }, { type: 'field', attrs: { key: 'name' } }] }] };
    expect(extractFields(doc)).toEqual(['name', 'date']);
  });
  it('slugs including Arabic', () => {
    expect(slug(' Issue Date ')).toBe('issue_date');
    expect(slug('الاسم')).toBe('الاسم');
  });
});
