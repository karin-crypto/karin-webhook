import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCompare } from '../lib/compare.jsx';
import { getFundsByIds } from '../data/api.js';

export default function CompareBar() {
  const { ids, remove, clear, max } = useCompare();
  const [funds, setFunds] = useState([]);
  const { pathname } = useLocation();
  useEffect(() => { let on = true; getFundsByIds(ids).then(f => on && setFunds(f)); return () => { on = false; }; }, [ids]);
  if (!ids.length || pathname === '/compare') return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-3" role="region" aria-label="סרגל השוואה">
      <div className="flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl bg-navy p-3 text-white shadow-pop">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-black">להשוואה <span className="text-sky">{ids.length}</span>/{max}</span>
          {funds.map(f => (
            <span key={f.id} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 py-1 pe-1 ps-3 text-xs font-semibold">
              <i className="h-2 w-2 rounded-full" style={{ background: f.companyColor }} />{f.company} · {f.track}
              <button onClick={() => remove(f.id)} aria-label="הסרה" className="grid h-5 w-5 place-items-center rounded-full bg-white/15 text-[11px] font-black hover:bg-white/30">×</button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clear} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10">נקה</button>
          <Link to="/compare" className={`btn-primary !py-2 ${ids.length < 2 ? 'pointer-events-none opacity-60' : ''}`} aria-disabled={ids.length < 2}>השווה עכשיו ←</Link>
        </div>
      </div>
    </div>
  );
}
