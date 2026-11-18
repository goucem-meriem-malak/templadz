import { useEffect, useState } from 'react';
import { dict, dirOf, Lang } from './i18n';
import { api } from './api';
import brand from './brand';
import logo from './assets/logo.svg';
import Library from './Library';
import Workspace from './Workspace';

type View = { name: 'library' } | { name: 'work'; id?: string; fill?: boolean; k: number };

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) || 'en');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as any) || 'light');
  const [lic, setLic] = useState<boolean | null>(null);
  const [splash, setSplash] = useState(true);
  const [view, setView] = useState<View>({ name: 'library' });
  const t = (k: string) => dict[lang][k] ?? k;

  useEffect(() => {
    document.title = brand.name;
    document.documentElement.style.setProperty('--brand', brand.accent);
    api.licStatus().then((r) => setLic(r.ok));
    const id = setTimeout(() => setSplash(false), 900);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('theme', theme); document.documentElement.dataset.theme = theme; }, [theme]);

  if (splash || lic === null) return <div className="splash"><img src={logo} alt="" /><h1>{brand.name}</h1></div>;
  if (!lic) return <Activation lang={lang} onDone={() => setLic(true)} />;

  return (
    <div className="app" dir={dirOf(lang)} lang={lang}>
      {view.name === 'library' ? (
        <Library lang={lang} setLang={setLang} theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onWork={(id, fill) => setView({ name: 'work', id, fill, k: Date.now() })} />
      ) : (
        <Workspace key={view.k} lang={lang} setLang={setLang} id={view.id} startFill={view.fill}
          toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onBack={() => setView({ name: 'library' })} onNew={() => setView({ name: 'work', k: Date.now() })} />
      )}
    </div>
  );
}

function Activation({ lang, onDone }: { lang: Lang; onDone: () => void }) {
  const t = (k: string) => dict[lang][k] ?? k;
  const [code, setCode] = useState('');
  const [err, setErr] = useState(false);
  const go = async () => { (await api.licActivate(code)).ok ? onDone() : setErr(true); };
  return (
    <div className="app" dir={dirOf(lang)}>
      <div className="card center">
        <img src={logo} alt="" width={72} />
        <h2>{t('activate')} {brand.name}</h2>
        <input placeholder={t('code')} value={code} onChange={(e) => { setCode(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === 'Enter' && go()} dir="ltr" />
        <button className="btn primary" onClick={go}>{t('activate')}</button>
        {err && <p className="err">{t('invalid')}</p>}
      </div>
    </div>
  );
}
