import type { Doc } from './lib';
export type Tpl = { id?: string; name: string; doc: Doc; header?: string; footer?: string };
export type HF = { header: string; footer: string };
export interface Api {
  tplList(): Promise<{ id: string; name: string; updated: number }[]>;
  tplLoad(id: string): Promise<Tpl>;
  tplSave(t: Tpl): Promise<string>;
  tplDelete(id: string): Promise<void>;
  tplExport(id: string): Promise<string | null>;
  tplImport(): Promise<string | null>;
  fileSave(kind: 'pdf' | 'docx', payload: string, defaultName: string, hf: HF): Promise<string | null>;
  fileWrite(kind: 'pdf' | 'docx', name: string, payload: string, hf: HF): Promise<boolean>;
  dirPick(): Promise<string | null>;
  csvPick(): Promise<string | null>;
  printDoc(html: string, hf: HF): Promise<boolean>;
  fullscreen(): Promise<void>;
  paste(): Promise<void>;
  licStatus(): Promise<{ ok: boolean }>;
  licActivate(code: string): Promise<{ ok: boolean }>;
}
export const api = (window as any).templadz as Api;
