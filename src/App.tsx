import { useEffect, useState } from 'react';
import { dict, dirOf, Lang } from './i18n';
import { api, Lic } from './api';
import brand from './brand';
import Library from './Library';
import DesignView from './DesignView';
import FillView from './FillView';

type View = { name: 'library' } | { name: 'design'; id?: string } | { name: 'fill'; id: string };

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'en');
  const [lic, setLic] = useState<Lic | null>(null);
  const [view, setView] = useState<View>({ name: 'library' });
  const t = dict[lang];

  useEffect(() => {
    document.title = brand.name;
    document.documentElement.style.setProperty('--accent', brand.accent);
    api.licStatus().then(setLic);
  }, []);
  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);

  return (
    <div className="app" dir={dirOf(lang)} lang={lang}>
      <div className="topbar no-print">
        <strong>{brand.name}</strong>
        <span className="spacer" />
        {lic?.ok && <small>{lic.name} · {t.validUntil} {lic.exp}</small>}
        <select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          <option value="en">English</option><option value="fr">Français</option><option value="ar">العربية</option>
        </select>
      </div>
      {!lic ? null : !lic.ok ? (
        <Activation lic={lic} lang={lang} onDone={setLic} />
      ) : view.name === 'library' ? (
        <Library lang={lang} onDesign={(id) => setView({ name: 'design', id })} onFill={(id) => setView({ name: 'fill', id })} />
      ) : view.name === 'design' ? (
        <DesignView key={view.id ?? 'new'} lang={lang} id={view.id} onBack={() => setView({ name: 'library' })} />
      ) : (
        <FillView lang={lang} id={view.id} onBack={() => setView({ name: 'library' })} />
      )}
    </div>
  );
}

function Activation({ lic, lang, onDone }: { lic: Lic; lang: Lang; onDone: (l: Lic) => void }) {
  const t = dict[lang];
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const go = async () => {
    const r = await api.licActivate(code);
    if (r.ok) onDone(r);
    else setErr(r.reason === 'expired' ? t.expired : r.reason === 'nokey' ? t.noKey : t.invalid);
  };
  return (
    <div className="card center">
      <h2>{t.activateTitle} {brand.name}</h2>
      {lic.reason === 'expired' && <p className="err">{t.expired} ({lic.exp})</p>}
      <textarea rows={4} placeholder={t.code} value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
      <button className="btn primary" onClick={go}>{t.activate}</button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
