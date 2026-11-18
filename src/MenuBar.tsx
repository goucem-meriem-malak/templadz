import { useEffect, useRef, useState } from 'react';

export type Item = { label?: string; hint?: string; run?: () => void; check?: boolean; sep?: boolean };

export default function MenuBar({ menus }: { menus: { label: string; items: Item[] }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, []);
  return (
    <div className="menubar" ref={ref}>
      {menus.map((m, i) => (
        <div key={i} className="menu" onMouseEnter={() => open !== null && setOpen(i)}>
          <button className={open === i ? 'on' : ''} onClick={() => setOpen(open === i ? null : i)}>{m.label}</button>
          {open === i && (
            <div className="dropdown">
              {m.items.map((it, j) => it.sep ? <hr key={j} /> : (
                <div key={j} className="mi" onMouseDown={(e) => e.preventDefault()} onClick={() => { setOpen(null); it.run?.(); }}>
                  <span>{it.check ? '✓ ' : ''}{it.label}</span><kbd>{it.hint}</kbd>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
