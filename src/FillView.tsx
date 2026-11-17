import { useEffect, useMemo, useState } from 'react';
import { dict, Lang } from './i18n';
import { api, Tpl } from './api';
import { extractFields, parseCsv, wrapHtml } from './lib';
import { fillHtml } from './fill';

export default function FillView({ lang, id, onBack }: { lang: Lang; id: string; onBack: () => void }) {
  const t = dict[lang];
  const [tpl, setTpl] = useState<Tpl | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  useEffect(() => { api.tplLoad(id).then(setTpl); }, [id]);

  const fields = useMemo(() => (tpl ? extractFields(tpl.doc) : []), [tpl]);
  const html = useMemo(() => (tpl ? fillHtml(tpl.doc, values) : ''), [tpl, values]);

  const exportPdf = async () => {
    const p = await api.pdfSave(wrapHtml(html));
    if (p) setMsg(`${t.done} ${p}`);
  };

  const batch = async () => {
    if (!tpl) return;
    const csv = await api.csvPick();
    if (csv == null) return;
    const rows = parseCsv(csv);
    if (rows.length < 2) { setMsg(t.csvEmpty); return; }
    const head = rows[0].map((h) => h.trim());
    const missing = fields.filter((f) => !head.includes(f));
    if (missing.length) { setMsg(`${t.missing} ${missing.join(', ')}`); return; }
    const dir = await api.dirPick();
    if (!dir) return;
    for (let i = 1; i < rows.length; i++) {
      const v: Record<string, string> = {};
      head.forEach((h, j) => { v[h] = rows[i][j] ?? ''; });
      const label = v[fields[0]] || String(i);
      await api.pdfWrite(`${String(i).padStart(3, '0')}-${label}`, wrapHtml(fillHtml(tpl.doc, v)));
      setMsg(`${i} / ${rows.length - 1}`);
    }
    setMsg(`${t.done} ${dir}`);
  };

  if (!tpl) return null;
  return (
    <div>
      <div className="toolbar no-print">
        <button className="btn" onClick={onBack}>{t.back}</button>
        <strong>{tpl.name}</strong><span className="spacer" />
        {msg && <small>{msg}</small>}
        <button className="btn" onClick={batch} disabled={!fields.length}>{t.batch}</button>
        <button className="btn primary" onClick={exportPdf}>{t.pdf}</button>
      </div>
      <div className="split">
        <aside className="form no-print">
          {fields.length === 0 && <p className="muted">{t.noFields}</p>}
          {fields.map((f) => (
            <label key={f}>{f}
              <input value={values[f] ?? ''} onChange={(e) => setValues({ ...values, [f]: e.target.value })} />
            </label>
          ))}
        </aside>
        <main className="canvas"><div className="page" dangerouslySetInnerHTML={{ __html: html }} /></main>
      </div>
    </div>
  );
}
