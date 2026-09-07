import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchFundsSync } from '../data/api.js';
import ReturnCell from './ReturnCell.jsx';

export default function SearchBar({ size = 'md', autoFocus = false, placeholder = 'חפשי קופה, קרן, חברה או מסלול' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const nav = useNavigate();
  const box = useRef(null);
  const results = useMemo(() => searchFundsSync(q, 8), [q]);

  useEffect(() => {
    const onDoc = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (fund) => { setOpen(false); if (fund) nav(`/funds/${fund.id}`); else if (q.trim()) nav(`/funds?q=${encodeURIComponent(q.trim())}`); };
  const onKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); setOpen(true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, -1)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(active >= 0 ? results[active] : null); }
    else if (e.key === 'Escape') setOpen(false);
  };
  const big = size === 'lg';
  return (
    <div ref={box} className="relative w-full">
      <div className={`flex items-center gap-2 rounded-2xl border border-line bg-white shadow-card focus-within:border-blue focus-within:ring-4 focus-within:ring-blue/10 ${big ? 'p-2 ps-4' : 'p-1.5 ps-3'}`}>
        <svg className="shrink-0 text-muted" width={big ? 22 : 18} height={big ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input value={q} autoFocus={autoFocus} onChange={e => { setQ(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onKeyDown={onKey}
          placeholder={placeholder} aria-label="חיפוש" aria-autocomplete="list" aria-expanded={open}
          className={`w-full bg-transparent outline-none placeholder:text-muted/70 ${big ? 'py-2.5 text-lg' : 'py-1.5 text-sm'}`} />
        <button type="button" onClick={() => go(null)} className={`btn-primary shrink-0 ${big ? '' : '!px-3.5 !py-2 !text-xs'}`}>חיפוש</button>
      </div>
      {open && q.trim() && (
        <ul role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-pop">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-muted">לא נמצאו תוצאות עבור "{q}"</li>}
          {results.map((f, i) => (
            <li key={f.id} role="option" aria-selected={i === active} onMouseDown={() => go(f)} onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${i === active ? 'bg-ice' : 'hover:bg-page'}`}>
              <span className="flex items-center gap-2 truncate"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: f.companyColor }} /><span className="truncate font-semibold">{f.name}</span><span className="chip !py-0.5">{f.productName}</span></span>
              <span className="shrink-0 text-xs text-muted">12 ח׳ <ReturnCell value={f.returns.y1} /></span>
            </li>
          ))}
          {results.length > 0 && <li onMouseDown={() => go(null)} className="cursor-pointer border-t border-line px-4 py-2.5 text-center text-xs font-bold text-blue hover:bg-page">כל התוצאות עבור "{q}" ←</li>}
        </ul>
      )}
    </div>
  );
}
