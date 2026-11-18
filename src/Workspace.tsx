import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { extensions } from './extensions';
import { dict, dirOf, Lang, LANG_NAME } from './i18n';
import { api } from './api';
import { Doc, emptyDoc, extractFields, fileLabel, fillDoc, parseBracket, parseCsv, Row, sanitizeDoc, slug, wrapHtml } from './lib';
import { renderHtml } from './fill';
import { buildDocx } from './docx';
import MenuBar, { Item } from './MenuBar';
import logo from './assets/logo.svg';

const FONTS = ['Segoe UI', 'Arial', 'Times New Roman', 'Calibri', 'Cambria', 'Georgia', 'Verdana', 'Tahoma', 'Courier New', 'Traditional Arabic', 'Simplified Arabic', 'Sakkal Majalla'];
const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];
const PITCH = 257 * 3.7795; // printable A4 height (297mm - 2x20mm margins) in CSS px
const LANGS: Lang[] = ['en', 'fr', 'ar'];
const KEYS: [string, string][] = [
  ['Ctrl+N', 'new'], ['Ctrl+O', 'open'], ['Ctrl+S', 'save'], ['Ctrl+Shift+P', 'pdf'], ['Ctrl+Shift+D', 'docx'], ['Ctrl+P', 'print'],
  ['Ctrl+Z / Ctrl+Y', 'undo'], ['Ctrl+F / Ctrl+H', 'find'], ['Ctrl+A', 'selectAll'], ['Ctrl+Shift+V', 'field'], ['Ctrl+Enter', 'pageBreak'],
  ['Ctrl+B / I / U', 'bold'], ['Alt+Shift+5', 'strike'], ['Ctrl+Shift+L / E / R / J', 'aLeft'], ['Ctrl+Shift+8 / 7', 'bullets'],
  ['Ctrl+\\', 'clear'], ['Ctrl+Shift+F', 'quickFill'], ['Ctrl+Shift+C', 'wordCount'], ['F11', 'focus'],
];

function findRanges(ed: Editor, q: string) {
  const out: { from: number; to: number }[] = [];
  if (!q) return out;
  const ql = q.toLowerCase();
  ed.state.doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const t = node.text.toLowerCase();
      for (let i = t.indexOf(ql); i >= 0; i = t.indexOf(ql, i + q.length)) out.push({ from: pos + i, to: pos + i + q.length });
    }
  });
  return out;
}

export default function Workspace({ lang, setLang, id, startFill, toggleTheme, onBack, onNew }: {
  lang: Lang; setLang: (l: Lang) => void; id?: string; startFill?: boolean;
  toggleTheme: () => void; onBack: () => void; onNew: () => void;
}) {
  const t = (k: string) => dict[lang][k] ?? k;
  const [tid, setTid] = useState(id);
  const [name, setName] = useState('');
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [mode, setMode] = useState<'design' | 'fill'>('design');
  const [view, setView] = useState<'print' | 'read' | 'web'>('print');
  const [zoom, setZoom] = useState(100);
  const [ruler, setRuler] = useState(false);
  const [focus, setFocus] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [master, setMaster] = useState<Doc>(emptyDoc);
  const [values, setValues] = useState<Row>({});
  const [batch, setBatch] = useState('');
  const [csvRows, setCsvRows] = useState<Row[] | null>(null);
  const [pv, setPv] = useState(0);
  const [pages, setPages] = useState({ cur: 1, total: 1 });
  const [stat, setStat] = useState({ words: 0, chars: 0, all: 0 });
  const [draft, setDraft] = useState({ field: '', rows: '3', cols: '3', find: '', repl: '' });
  const innerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const act = useRef<(e: KeyboardEvent) => void>(() => {});

  const editor = useEditor({ extensions, content: emptyDoc as any });
  const c = () => editor!.chain().focus() as any;
  const hf = { header, footer };

  // ---- load template ----
  useEffect(() => {
    if (!id || !editor) return;
    api.tplLoad(id).then((tp) => {
      const doc = sanitizeDoc(tp.doc);
      setName(tp.name); setHeader(tp.header ?? ''); setFooter(tp.footer ?? '');
      editor.commands.setContent(doc as any);
      if (startFill) { setMaster(doc); setMode('fill'); }
    });
  }, [id, editor]);
  useEffect(() => { editor?.setEditable(mode === 'design' && view !== 'read'); }, [editor, mode, view]);

  // ---- fill data ----
  const fields = useMemo(() => extractFields(master), [master]);
  const parsed = useMemo(() => {
    if (csvRows) return { rows: csvRows, errors: [] as string[] };
    if (batch.trim()) return parseBracket(batch, fields, values);
    return { rows: [{ ...values }], errors: [] as string[] };
  }, [csvRows, batch, fields, values]);
  const rows = parsed.rows;
  const cur = Math.min(pv, rows.length - 1);
  const previewHtml = useMemo(() => (mode === 'fill' ? renderHtml(master, rows[cur] ?? {}) : ''), [mode, master, rows, cur]);
  const errText = (e: string) => {
    const i = e.indexOf(':'); const code = i < 0 ? e : e.slice(0, i); const v = i < 0 ? '' : e.slice(i + 1);
    return code === 'unknown' ? `${t('errUnknown')} ${v}` : code === 'length' ? `${t('errLen')} ${v}` : t('errSyntax');
  };

  // ---- page / word indicators ----
  const measure = () => {
    const el = innerRef.current; if (!el) return;
    const z = zoom / 100; const r = el.getBoundingClientRect();
    const total = Math.max(1, Math.ceil((r.height / z - 2) / PITCH));
    let curP = 1;
    if (editor && mode === 'design' && !editor.isDestroyed) {
      try { const co = editor.view.coordsAtPos(editor.state.selection.head); curP = Math.min(total, Math.max(1, Math.floor((co.top - r.top) / z / PITCH) + 1)); } catch { /* not mounted yet */ }
    }
    setPages((p) => (p.cur === curP && p.total === total ? p : { cur: curP, total }));
    const text = el.innerText || '';
    setStat({ words: (text.trim().match(/\S+/g) || []).length, chars: text.replace(/\s/g, '').length, all: text.replace(/\n/g, '').length });
  };
  useEffect(() => {
    measure();
    editor?.on('update', measure); editor?.on('selectionUpdate', measure);
    const ro = innerRef.current ? new ResizeObserver(measure) : null;
    if (ro && innerRef.current) ro.observe(innerRef.current);
    return () => { editor?.off('update', measure); editor?.off('selectionUpdate', measure); ro?.disconnect(); };
  }, [editor, zoom, mode, view, previewHtml]);

  // ---- actions ----
  const save = async () => {
    if (!editor) return undefined;
    const nid = await api.tplSave({ id: tid, name: name.trim() || t('untitled'), doc: (mode === 'design' ? editor.getJSON() : master) as Doc, header, footer });
    setTid(nid); setMsg(t('saved')); return nid;
  };
  const share = async () => { const nid = await save(); if (nid) await api.tplExport(nid); };
  const enterFill = () => { if (!editor) return; setMaster(sanitizeDoc(editor.getJSON() as Doc)); setPv(0); setMode('fill'); };
  const exitFill = () => setMode('design');
  const toggleFill = () => (mode === 'fill' ? exitFill() : enterFill());
  const toggleFocus = () => { setFocus((f) => !f); api.fullscreen(); };
  const currentDoc = () => (mode === 'fill' ? master : (editor!.getJSON() as Doc));

  const doExport = async (kind: 'pdf' | 'docx') => {
    if (!editor) return;
    if (mode === 'fill' && parsed.errors.length) { setMsg(errText(parsed.errors[0])); return; }
    const doc = currentDoc();
    const list: (Row | null)[] = mode === 'fill' ? rows : [null];
    const base = name.trim() || t('untitled');
    const make = async (row: Row | null) => (kind === 'pdf' ? wrapHtml(renderHtml(doc, row)) : buildDocx(fillDoc(doc, row), header, footer));
    try {
      if (list.length === 1) {
        const label = fileLabel(base, fields, list[0] ?? {}, 0, new Set());
        const p = await api.fileSave(kind, await make(list[0]), `${label}.${kind}`, hf);
        if (p) setMsg(`${t('done')} ${p}`);
        return;
      }
      const dir = await api.dirPick(); if (!dir) return;
      const used = new Set<string>();
      for (let i = 0; i < list.length; i++) {
        await api.fileWrite(kind, fileLabel(base, fields, list[i]!, i, used), await make(list[i]), hf);
        setMsg(`${i + 1} / ${list.length}`);
      }
      setMsg(`${t('done')} ${dir}`);
    } catch (e: any) { setMsg(String(e?.message || e)); }
  };
  const doPrint = async () => { if (editor) await api.printDoc(wrapHtml(renderHtml(currentDoc(), mode === 'fill' ? rows[cur] ?? {} : null)), hf); };

  const importCsv = async () => {
    const csv = await api.csvPick(); if (csv == null) return;
    const all = parseCsv(csv); if (all.length < 2) return;
    const head = all[0].map((h) => h.trim());
    const missing = fields.filter((f) => !head.includes(f));
    if (missing.length) { setMsg(`${t('errMissing')} ${missing.join(', ')}`); return; }
    setCsvRows(all.slice(1).map((r) => { const o: Row = { ...values }; head.forEach((h, j) => { if (fields.includes(h)) o[h] = r[j] ?? ''; }); return o; }));
    setPv(0);
  };

  const openField = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    setDraft((d) => ({ ...d, field: slug(editor.state.doc.textBetween(from, to, ' ')) })); setModal('field');
  };
  const insertField = () => {
    const key = slug(draft.field); if (!key) return;
    c().insertContent({ type: 'field', attrs: { key } }).run(); setModal(null);
  };
  const onImage = (f?: File) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setMsg(t('errImg')); return; }
    const r = new FileReader(); r.onload = () => c().setImage({ src: String(r.result) }).run(); r.readAsDataURL(f);
  };
  const dirAttr = (dir: string) => c().updateAttributes('paragraph', { dir }).updateAttributes('heading', { dir }).updateAttributes('listItem', { dir }).run();
  const lineSp = (v: string) => c().updateAttributes('paragraph', { lineHeight: v }).updateAttributes('heading', { lineHeight: v }).run();
  const clearFmt = () => c().unsetAllMarks().unsetTextAlign().run();
  const setPageNum = () => setFooter((f) => (f ? f + ' {{page}}' : `${t('page')} {{page}} ${t('of')} {{pages}}`));
  const insertDate = () => c().insertContent(new Date().toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-GB')).run();
  const doCopy = (cmd: 'cut' | 'copy') => { editor?.view.focus(); document.execCommand(cmd); };
  const doPaste = () => { editor?.view.focus(); api.paste(); };
  const cycleLang = () => setLang(LANGS[(LANGS.indexOf(lang) + 1) % 3]);

  // find & replace
  const ranges = () => (editor ? findRanges(editor, draft.find) : []);
  const findNext = () => {
    if (!editor) return; const rs = ranges(); if (!rs.length) return;
    const r = rs.find((x) => x.from >= editor.state.selection.to) ?? rs[0];
    c().setTextSelection(r).scrollIntoView().run();
  };
  const replaceOne = () => {
    if (!editor) return; const { from, to } = editor.state.selection;
    if (editor.state.doc.textBetween(from, to).toLowerCase() === draft.find.toLowerCase() && draft.find) c().insertContentAt({ from, to }, draft.repl).run();
    findNext();
  };
  const replaceAll = () => {
    const rs = ranges().reverse(); if (!rs.length) return;
    editor!.chain().command(({ tr }) => { rs.forEach((r) => tr.insertText(draft.repl, r.from, r.to)); return true; }).run();
  };

  // ---- keyboard shortcuts (global) ----
  act.current = (e) => {
    if (e.defaultPrevented || !editor) return;
    const m = e.ctrlKey || e.metaKey; const run = (f: () => void) => { e.preventDefault(); f(); };
    if (e.key === 'F11') return run(toggleFocus);
    if (e.key === 'Escape' && focus) return run(toggleFocus);
    if (e.altKey && e.shiftKey && e.code === 'Digit5') return run(() => c().toggleStrike().run());
    if (!m) return;
    if (e.shiftKey) {
      const map: Record<string, () => void> = {
        KeyP: () => doExport('pdf'), KeyD: () => doExport('docx'), KeyV: openField, KeyF: toggleFill, KeyC: () => setModal('stats'),
        KeyL: () => c().setTextAlign('left').run(), KeyE: () => c().setTextAlign('center').run(), KeyR: () => c().setTextAlign('right').run(),
        KeyJ: () => c().setTextAlign('justify').run(), Digit8: () => c().toggleBulletList().run(), Digit7: () => c().toggleOrderedList().run(),
      };
      if (map[e.code]) run(map[e.code]);
      return;
    }
    const map: Record<string, () => void> = {
      KeyN: onNew, KeyO: onBack, KeyS: save, KeyP: doPrint, KeyF: () => setModal('find'), KeyH: () => setModal('find'),
      Enter: () => c().setPageBreak().run(), Backslash: clearFmt,
    };
    if (map[e.code]) run(map[e.code]);
  };
  useEffect(() => { const f = (e: KeyboardEvent) => act.current(e); window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f); }, []);

  // ---- menus ----
  const sep: Item = { sep: true };
  const menus: { label: string; items: Item[] }[] = [
    { label: t('mFile'), items: [
      { label: t('new'), hint: 'Ctrl+N', run: onNew }, { label: t('open'), hint: 'Ctrl+O', run: onBack }, { label: t('save'), hint: 'Ctrl+S', run: save }, sep,
      { label: t('pdf'), hint: 'Ctrl+Shift+P', run: () => doExport('pdf') }, { label: t('docx'), hint: 'Ctrl+Shift+D', run: () => doExport('docx') },
      { label: t('share'), run: share }, sep, { label: t('print'), hint: 'Ctrl+P', run: doPrint } ] },
    { label: t('mEdit'), items: [
      { label: t('undo'), hint: 'Ctrl+Z', run: () => c().undo().run() }, { label: t('redo'), hint: 'Ctrl+Y', run: () => c().redo().run() }, sep,
      { label: t('cut'), hint: 'Ctrl+X', run: () => doCopy('cut') }, { label: t('copy'), hint: 'Ctrl+C', run: () => doCopy('copy') }, { label: t('paste'), hint: 'Ctrl+V', run: doPaste }, sep,
      { label: t('find'), hint: 'Ctrl+F', run: () => setModal('find') }, { label: t('replace'), hint: 'Ctrl+H', run: () => setModal('find') },
      { label: t('selectAll'), hint: 'Ctrl+A', run: () => c().selectAll().run() } ] },
    { label: t('mView'), items: [
      { label: t('printLayout'), check: view === 'print', run: () => setView('print') }, { label: t('readMode'), check: view === 'read', run: () => setView('read') },
      { label: t('webLayout'), check: view === 'web', run: () => setView('web') }, sep,
      { label: t('ruler'), check: ruler, run: () => setRuler(!ruler) }, { label: t('theme'), run: toggleTheme }, { label: t('focus'), hint: 'F11', run: toggleFocus } ] },
    { label: t('mInsert'), items: [
      { label: t('field'), hint: 'Ctrl+Shift+V', run: openField }, { label: t('table'), run: () => setModal('table') },
      { label: t('addRow'), run: () => c().addRowAfter().run() }, { label: t('delRow'), run: () => c().deleteRow().run() },
      { label: t('addCol'), run: () => c().addColumnAfter().run() }, { label: t('delCol'), run: () => c().deleteColumn().run() },
      { label: t('delTable'), run: () => c().deleteTable().run() }, sep,
      { label: t('image'), run: () => fileRef.current?.click() }, { label: t('hr'), run: () => c().setHorizontalRule().run() },
      { label: t('pageBreak'), hint: 'Ctrl+Enter', run: () => c().setPageBreak().run() }, sep,
      { label: t('headerFooter'), run: () => setModal('hf') }, { label: t('date'), run: insertDate }, { label: t('pageNum'), run: setPageNum } ] },
    { label: t('mFormat'), items: [
      { label: t('bold'), hint: 'Ctrl+B', run: () => c().toggleBold().run() }, { label: t('italic'), hint: 'Ctrl+I', run: () => c().toggleItalic().run() },
      { label: t('underline'), hint: 'Ctrl+U', run: () => c().toggleUnderline().run() }, { label: t('strike'), hint: 'Alt+Shift+5', run: () => c().toggleStrike().run() }, sep,
      { label: t('aLeft'), hint: 'Ctrl+Shift+L', run: () => c().setTextAlign('left').run() }, { label: t('aCenter'), hint: 'Ctrl+Shift+E', run: () => c().setTextAlign('center').run() },
      { label: t('aRight'), hint: 'Ctrl+Shift+R', run: () => c().setTextAlign('right').run() }, { label: t('aJustify'), hint: 'Ctrl+Shift+J', run: () => c().setTextAlign('justify').run() }, sep,
      ...['1', '1.15', '1.5', '2'].map((v) => ({ label: `${t('lineSp')}: ${v}`, run: () => lineSp(v) })), sep,
      { label: t('bullets'), hint: 'Ctrl+Shift+8', run: () => c().toggleBulletList().run() }, { label: t('numbered'), hint: 'Ctrl+Shift+7', run: () => c().toggleOrderedList().run() }, sep,
      { label: t('ltr'), run: () => dirAttr('ltr') }, { label: t('rtl'), run: () => dirAttr('rtl') }, sep,
      { label: t('clear'), hint: 'Ctrl+\\', run: clearFmt } ] },
    { label: t('mTools'), items: [
      { label: mode === 'fill' ? t('editor') : t('quickFill'), hint: 'Ctrl+Shift+F', run: toggleFill },
      { label: t('wordCount'), hint: 'Ctrl+Shift+C', run: () => setModal('stats') }, sep,
      ...LANGS.map((l) => ({ label: LANG_NAME[l], check: l === lang, run: () => setLang(l) })) ] },
    { label: t('mHelp'), items: [{ label: t('shortcuts'), run: () => setModal('keys') }, { label: t('about'), run: () => setModal('about') }] },
  ];

  const B = (title: string, label: ReactNode, run: () => void, hint?: string, active?: boolean) => (
    <button className={'rb' + (active ? ' on' : '')} title={hint ? `${title} (${hint})` : title} onMouseDown={(e) => e.preventDefault()} onClick={run}>{label}</button>
  );
  const ts = editor?.getAttributes('textStyle') ?? {};
  const inTable = !!editor?.isActive('table');

  return (
    <div className={`ws view-${view}${focus ? ' focus' : ''}${ruler ? ' show-margins' : ''}`} dir={dirOf(lang)} lang={lang}>
      {!focus && (
        <div className="head no-print">
          <img src={logo} alt="" height={26} />
          <input className="name" placeholder={t('tplName')} value={name} onChange={(e) => setName(e.target.value)} />
          <span className="spacer" />{msg && <small className="msg">{msg}</small>}
          <button className="btn" title={t('theme')} onClick={toggleTheme}>◐</button>
        </div>
      )}
      {!focus && <MenuBar menus={menus} />}
      {!focus && view !== 'read' && mode === 'design' && (
        <div className="ribbon no-print">
          {B(t('undo'), '↶', () => c().undo().run(), 'Ctrl+Z')}{B(t('redo'), '↷', () => c().redo().run(), 'Ctrl+Y')}
          <select title={t('font')} value={ts.fontFamily ?? ''} onChange={(e) => e.target.value ? c().setFontFamily(e.target.value).run() : c().unsetFontFamily().run()}>
            <option value="">{t('font')}</option>{FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select title={t('size')} value={ts.fontSize ? parseFloat(ts.fontSize) : ''} onChange={(e) => c().setFontSize(e.target.value + 'pt').run()}>
            <option value="">{t('size')}</option>{SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {B(t('bold'), <b>B</b>, () => c().toggleBold().run(), 'Ctrl+B', editor?.isActive('bold'))}
          {B(t('italic'), <i>I</i>, () => c().toggleItalic().run(), 'Ctrl+I', editor?.isActive('italic'))}
          {B(t('underline'), <u>U</u>, () => c().toggleUnderline().run(), 'Ctrl+U', editor?.isActive('underline'))}
          {B(t('strike'), <s>S</s>, () => c().toggleStrike().run(), 'Alt+Shift+5', editor?.isActive('strike'))}
          <label className="rb" title={t('color')}>A<input type="color" defaultValue="#111111" onChange={(e) => c().setColor(e.target.value).run()} /></label>
          <label className="rb" title={t('highlight')}>▮<input type="color" defaultValue="#ffff00" onChange={(e) => c().setHighlight({ color: e.target.value }).run()} /></label>
          {B(t('aLeft'), '⫷', () => c().setTextAlign('left').run(), 'Ctrl+Shift+L')}{B(t('aCenter'), '≡', () => c().setTextAlign('center').run(), 'Ctrl+Shift+E')}
          {B(t('aRight'), '⫸', () => c().setTextAlign('right').run(), 'Ctrl+Shift+R')}{B(t('aJustify'), '☰', () => c().setTextAlign('justify').run(), 'Ctrl+Shift+J')}
          <select title={t('lineSp')} defaultValue="" onChange={(e) => e.target.value && lineSp(e.target.value)}>
            <option value="">{t('lineSp')}</option>{['1', '1.15', '1.5', '2'].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          {B(t('bullets'), '•≡', () => c().toggleBulletList().run(), 'Ctrl+Shift+8', editor?.isActive('bulletList'))}
          {B(t('numbered'), '1.≡', () => c().toggleOrderedList().run(), 'Ctrl+Shift+7', editor?.isActive('orderedList'))}
          {B(t('ltr'), 'LTR', () => dirAttr('ltr'))}{B(t('rtl'), 'RTL', () => dirAttr('rtl'))}
          {B(t('clear'), 'Tx', clearFmt, 'Ctrl+\\')}
          <span className="vsep" />
          {B(t('field'), '{{ }}', openField, 'Ctrl+Shift+V')}{B(t('table'), '▦', () => setModal('table'))}{B(t('image'), '🖼', () => fileRef.current?.click())}
          {inTable && <>{B(t('addRow'), '+⇩', () => c().addRowAfter().run())}{B(t('delRow'), '−⇩', () => c().deleteRow().run())}{B(t('addCol'), '+⇨', () => c().addColumnAfter().run())}{B(t('delCol'), '−⇨', () => c().deleteColumn().run())}{B(t('delTable'), '✕▦', () => c().deleteTable().run())}</>}
        </div>
      )}

      <div className="body">
        {mode === 'fill' && !focus && (
          <aside className="panel no-print">
            <button className="btn" onClick={exitFill}>← {t('editor')}</button>
            <h4>{t('fieldsT')}</h4>
            {fields.length === 0 && <p className="muted">{t('noFields')}</p>}
            {fields.map((f) => (
              <label key={f}>{f}<input value={values[f] ?? ''} onChange={(e) => setValues({ ...values, [f]: e.target.value })} /></label>
            ))}
            <h4>{t('batchT')}</h4>
            <textarea rows={4} dir="ltr" placeholder={t('batchHint')} value={batch} onChange={(e) => { setBatch(e.target.value); setPv(0); }} disabled={!!csvRows} />
            <div className="row">
              <button className="btn" onClick={importCsv}>{t('csv')}</button>
              {csvRows && <><small>{t('csvRows')} {csvRows.length}</small><button className="btn" onClick={() => setCsvRows(null)}>{t('clearCsv')}</button></>}
            </div>
            {parsed.errors.map((e) => <p className="err" key={e}>{errText(e)}</p>)}
            <div className="row">
              <small>{t('rowsN')} {rows.length}</small><span className="spacer" />
              {rows.length > 1 && <><button className="btn" onClick={() => setPv(Math.max(0, cur - 1))}>‹</button><small>{cur + 1}/{rows.length}</small><button className="btn" onClick={() => setPv(Math.min(rows.length - 1, cur + 1))}>›</button></>}
            </div>
            <div className="row"><button className="btn primary" onClick={() => doExport('pdf')}>PDF</button><button className="btn" onClick={() => doExport('docx')}>DOCX</button></div>
          </aside>
        )}
        <main className="canvas">
          <div className="zoomwrap" style={{ zoom: zoom / 100 }}>
            {ruler && <div className="ruler" />}
            <div className="page">
              <div className={'inner' + (view === 'print' ? ' guides' : '')} ref={innerRef}>
                {mode === 'design' ? <EditorContent editor={editor} /> : <div className="doc-fill" dangerouslySetInnerHTML={{ __html: previewHtml }} />}
              </div>
            </div>
          </div>
        </main>
      </div>

      {!focus && (
        <footer className="status no-print">
          <span>{t('page')} {pages.cur} {t('of')} {pages.total}</span>
          <button className="link" onClick={() => setModal('stats')}>{stat.words} {t('words')}</button>
          <button className="link" title={t('language')} onClick={cycleLang}>{LANG_NAME[lang]}</button>
          <span className="spacer" />
          {B(t('readMode'), '📖', () => setView('read'), undefined, view === 'read')}{B(t('printLayout'), '▭', () => setView('print'), undefined, view === 'print')}{B(t('webLayout'), '🌐', () => setView('web'), undefined, view === 'web')}
          <button className="link" onClick={() => setZoom(Math.max(50, zoom - 10))}>−</button>
          <input type="range" min={50} max={200} step={10} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
          <button className="link" onClick={() => setZoom(Math.min(200, zoom + 10))}>+</button>
          <span className="zoomv">{zoom}%</span>
        </footer>
      )}

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(e) => { onImage(e.target.files?.[0]); e.target.value = ''; }} />

      {modal && (
        <div className="overlay" onMouseDown={() => setModal(null)}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()} dir={dirOf(lang)}>
            {modal === 'field' && <>
              <h3>{t('field')}</h3>
              <input autoFocus placeholder={t('fieldName')} value={draft.field} onChange={(e) => setDraft({ ...draft, field: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && insertField()} />
              <button className="btn primary" onClick={insertField}>{t('insert')}</button>
            </>}
            {modal === 'table' && <>
              <h3>{t('table')}</h3>
              <label>{t('rows')}<input type="number" min={1} max={50} value={draft.rows} onChange={(e) => setDraft({ ...draft, rows: e.target.value })} /></label>
              <label>{t('cols')}<input type="number" min={1} max={12} value={draft.cols} onChange={(e) => setDraft({ ...draft, cols: e.target.value })} /></label>
              <button className="btn primary" onClick={() => { c().insertTable({ rows: Math.min(50, +draft.rows || 3), cols: Math.min(12, +draft.cols || 3), withHeaderRow: true }).run(); setModal(null); }}>{t('insert')}</button>
            </>}
            {modal === 'hf' && <>
              <h3>{t('headerFooter')}</h3>
              <label>{t('headerT')}<input value={header} onChange={(e) => setHeader(e.target.value)} /></label>
              <label>{t('footerT')}<input value={footer} onChange={(e) => setFooter(e.target.value)} /></label>
              <small className="muted" dir="ltr">{t('hfHint')}</small>
              <button className="btn primary" onClick={() => setModal(null)}>{t('close')}</button>
            </>}
            {modal === 'find' && <>
              <h3>{t('replace')}</h3>
              <input autoFocus placeholder={t('find')} value={draft.find} onChange={(e) => setDraft({ ...draft, find: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && findNext()} />
              <input placeholder={t('replaceT')} value={draft.repl} onChange={(e) => setDraft({ ...draft, repl: e.target.value })} />
              <small className="muted">{ranges().length} {t('matches')}</small>
              <div className="row"><button className="btn" onClick={findNext}>{t('next')}</button><button className="btn" onClick={replaceOne}>{t('replaceOne')}</button><button className="btn primary" onClick={replaceAll}>{t('replaceAll')}</button></div>
            </>}
            {modal === 'stats' && <>
              <h3>{t('wordCount')}</h3>
              <table className="kv"><tbody>
                <tr><td>{t('words')}</td><td>{stat.words}</td></tr><tr><td>{t('chars')}</td><td>{stat.chars}</td></tr>
                <tr><td>{t('chars')} (+ )</td><td>{stat.all}</td></tr><tr><td>{t('page')}</td><td>{pages.total}</td></tr><tr><td>{t('fieldsT')}</td><td>{extractFields(currentDoc()).length}</td></tr>
              </tbody></table>
              <button className="btn primary" onClick={() => setModal(null)}>{t('close')}</button>
            </>}
            {modal === 'keys' && <>
              <h3>{t('shortcuts')}</h3>
              <table className="kv"><tbody>{KEYS.map(([k, l]) => <tr key={k}><td>{t(l)}</td><td dir="ltr"><kbd>{k}</kbd></td></tr>)}</tbody></table>
              <button className="btn primary" onClick={() => setModal(null)}>{t('close')}</button>
            </>}
            {modal === 'about' && <>
              <img src={logo} alt="" width={64} /><h3>Templadz 0.2.0</h3>
              <button className="btn primary" onClick={() => setModal(null)}>{t('close')}</button>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
