import { useEffect, useState } from 'react';
import { dict, Lang, LANG_NAME } from './i18n';
import { api } from './api';
import brand from './brand';
import logo from './assets/logo.svg';

export default function Library({ lang, setLang, theme, toggleTheme, onWork }: {
  lang: Lang; setLang: (l: Lang) => void; theme: string; toggleTheme: () => void; onWork: (id?: string, fill?: boolean) => void;
}) {
  const t = (k: string) => dict[lang][k] ?? k;
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [err, setErr] = useState('');
  const load = () => api.tplList().then(setItems);
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { if (window.confirm(t('confirmDel'))) { await api.tplDelete(id); load(); } };
  const imp = async () => { try { if (await api.tplImport()) load(); } catch { setErr(t('invalid')); } };

  return (
    <>
      <div className="topbar">
        <img src={logo} alt="" height={28} /><strong>{brand.name}</strong><span className="spacer" />
        <button className="btn" onClick={toggleTheme}>{theme === 'dark' ? '☀' : '☾'}</button>
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {(Object.keys(LANG_NAME) as Lang[]).map((l) => <option key={l} value={l}>{LANG_NAME[l]}</option>)}
        </select>
      </div>
      <div className="content">
        <div className="row">
          <h2>{t('library')}</h2><span className="spacer" />
          <button className="btn" onClick={imp}>{t('importTpl')}</button>
          <button className="btn primary" onClick={() => onWork()}>{t('newTpl')}</button>
        </div>
        {err && <p className="err">{err}</p>}
        {items.length === 0 && <p className="muted">{t('empty')}</p>}
        <div className="grid">
          {items.map((i) => (
            <div className="card" key={i.id}>
              <h3>{i.name}</h3>
              <div className="row">
                <button className="btn primary" onClick={() => onWork(i.id, true)}>{t('fill')}</button>
                <button className="btn" onClick={() => onWork(i.id)}>{t('edit')}</button>
                <button className="btn" onClick={() => del(i.id)}>{t('del')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
