import { useEffect, useState } from 'react';
import { dict, Lang } from './i18n';
import { api } from './api';

export default function Library({ lang, onDesign, onFill }: { lang: Lang; onDesign: (id?: string) => void; onFill: (id: string) => void }) {
  const t = dict[lang];
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [err, setErr] = useState('');
  const load = () => api.tplList().then(setItems);
  useEffect(() => { load(); }, []);

  const del = async (id: string) => { if (window.confirm(t.confirmDel)) { await api.tplDelete(id); load(); } };
  const imp = async () => {
    try { if (await api.tplImport()) load(); } catch { setErr(t.invalid); }
  };

  return (
    <div className="content">
      <div className="row">
        <h2>{t.library}</h2><span className="spacer" />
        <button className="btn" onClick={imp}>{t.importTpl}</button>
        <button className="btn primary" onClick={() => onDesign()}>{t.newTpl}</button>
      </div>
      {err && <p className="err">{err}</p>}
      {items.length === 0 && <p className="muted">{t.empty}</p>}
      <div className="grid">
        {items.map((i) => (
          <div className="card" key={i.id}>
            <h3>{i.name}</h3>
            <div className="row">
              <button className="btn primary" onClick={() => onFill(i.id)}>{t.fill}</button>
              <button className="btn" onClick={() => onDesign(i.id)}>{t.edit}</button>
              <button className="btn" onClick={() => del(i.id)}>{t.del}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
