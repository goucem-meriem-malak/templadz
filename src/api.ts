import type { Doc } from './lib';
export type Tpl = { id?: string; name: string; doc: Doc };
export type Lic = { ok: boolean; reason?: string; name?: string; exp?: string };
export interface Api {
  tplList(): Promise<{ id: string; name: string; updated: number }[]>;
  tplLoad(id: string): Promise<Tpl>;
  tplSave(t: Tpl): Promise<string>;
  tplDelete(id: string): Promise<void>;
  tplExport(id: string): Promise<string | null>;
  tplImport(): Promise<string | null>;
  pdfSave(html: string): Promise<string | null>;
  pdfWrite(name: string, html: string): Promise<boolean>;
  csvPick(): Promise<string | null>;
  dirPick(): Promise<string | null>;
  licStatus(): Promise<Lic>;
  licActivate(code: string): Promise<Lic>;
}
export const api = (window as any).templadz as Api;
