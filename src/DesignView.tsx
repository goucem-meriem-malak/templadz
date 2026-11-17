import { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { extensions } from './extensions';
import { dict, Lang } from './i18n';
import { api } from './api';
import { Doc, emptyDoc, slug } from './lib';

export default function DesignView({ lang, id: initialId, onBack }: { lang: Lang; id?: string; onBack: () => void }) {
  const t = dict[lang];
  const [id, setId] = useState(initialId);
  const [name, setName] = useState('');
  const [fname, setFname] = useState('');
  const [msg, setMsg] = useState('');
  const editor = useEditor({ extensions, content: emptyDoc });

  useEffect(() => {
    if (initialId && editor) api.tplLoad(initialId).then((tp) => { setName(tp.name); editor.commands.setContent(tp.doc as any); });
  }, [initialId, editor]);

  const btn = (label: string, f: () => void) => (
    <button className="btn" onMouseDown={(e) => e.preventDefault()} onClick={f}>{label}</button>
  );

  const insertField = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const key = slug(fname || editor.state.doc.textBetween(from, to, ' '));
    if (!key) return;
    editor.chain().focus().insertContent({ type: 'field', attrs: { key } }).run();
    setFname('');
  };

  const save = async (): Promise<string | undefined> => {
    if (!editor) return;
    const nid = await api.tplSave({ id, name: name.trim() || 'Untitled', doc: editor.getJSON() as Doc });
    setId(nid); setMsg(t.saved); return nid;
  };
  const share = async () => { const nid = await save(); if (nid) await api.tplExport(nid); };

  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn" onClick={onBack}>{t.back}</button>
        <input className="name" placeholder={t.tplName} value={name} onChange={(e) => setName(e.target.value)} />
        {btn(t.bold, () => editor?.chain().focus().toggleBold().run())}
        {btn(t.italic, () => editor?.chain().focus().toggleItalic().run())}
        {btn(t.h1, () => editor?.chain().focus().toggleHeading({ level: 1 }).run())}
        {btn(t.list, () => editor?.chain().focus().toggleBulletList().run())}
        <input placeholder={t.fieldName} value={fname} onChange={(e) => setFname(e.target.value)} />
        <button className="btn" onClick={insertField}>{t.addField}</button>
        <span className="spacer" />
        {msg && <small>{msg}</small>}
        <button className="btn" onClick={share}>{t.share}</button>
        <button className="btn primary" onClick={save}>{t.save}</button>
      </div>
      <main className="canvas"><div className="page"><EditorContent editor={editor} /></div></main>
    </div>
  );
}
