import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Filters, { EMPTY_FILTERS } from '../components/Filters.jsx';
import FundTable from '../components/FundTable.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { getCompanies, getFunds, getMeta } from '../data/api.js';
import { PRODUCT_LABELS, fmtMonthHe } from '../lib/format.js';

export default function Funds() {
  const [params, setParams] = useSearchParams();
  const [funds, setFunds] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [meta, setMeta] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(() => ({ ...EMPTY_FILTERS, q: params.get('q') || '', product: params.get('product') || 'all', track: params.get('track') || 'all' }));

  useEffect(() => { Promise.all([getFunds(), getCompanies(), getMeta()]).then(([f, c, m]) => { setFunds(f); setCompanies(c); setMeta(m); }); }, []);
  // keep URL in sync with primary filters (shareable links)
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.q) next.set('q', filters.q);
    if (filters.product !== 'all') next.set('product', filters.product);
    if (filters.track !== 'all') next.set('track', filters.track);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
  }, [filters.q, filters.product, filters.track]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const q = params.get('q') || ''; const p = params.get('product') || 'all'; setFilters(f => (f.q === q && f.product === p ? f : { ...f, q, product: p })); }, [params]);

  const tracks = useMemo(() => funds ? [...new Set(funds.filter(f => filters.product === 'all' || f.product === filters.product).map(f => f.track))] : [], [funds, filters.product]);

  const filtered = useMemo(() => {
    if (!funds) return [];
    const q = filters.q.trim().toLowerCase();
    return funds.filter(f =>
      (filters.product === 'all' || f.product === filters.product) &&
      (filters.track === 'all' || f.track === filters.track) &&
      (!filters.companies.length || filters.companies.includes(f.companyId)) &&
      f.risk >= filters.riskMin && f.risk <= filters.riskMax &&
      (filters.y1Min === '' || f.returns.y1 >= +filters.y1Min) &&
      (filters.y1Max === '' || f.returns.y1 <= +filters.y1Max) &&
      (!q || `${f.name} ${f.company} ${f.track} ${f.productName}`.toLowerCase().includes(q))
    );
  }, [funds, filters]);

  return (
    <section className="container-x py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">השוואת מסלולים</span>
          <h1 className="h2 mt-1">{filters.product === 'all' ? 'כל מוצרי החיסכון' : PRODUCT_LABELS[filters.product]}</h1>
          <p className="mt-1 text-sm text-muted">{meta ? <>נתונים נכון ל-{fmtMonthHe(meta.asOf)} · {meta.demo && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">נתוני דמו</span>}</> : 'טוען…'}</p>
        </div>
        <div className="w-full sm:w-96"><SearchBar placeholder="חיפוש מהיר בטבלה…" /></div>
      </div>
      {filters.q && <div className="mb-4 flex items-center gap-2 text-sm"><span className="text-muted">תוצאות עבור</span><span className="chip !text-navy">"{filters.q}"<button onClick={() => setFilters(f => ({ ...f, q: '' }))} aria-label="ניקוי חיפוש" className="ms-1 font-black">×</button></span></div>}

      <button onClick={() => setShowFilters(s => !s)} className="btn-ghost mb-4 w-full lg:hidden">{showFilters ? 'הסתרת סינון' : 'סינון מתקדם'}</button>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className={showFilters ? '' : 'hidden lg:block'}><Filters filters={filters} onChange={setFilters} companies={companies} tracks={tracks} resultCount={filtered.length} /></div>
        <div className="min-w-0">{funds ? <FundTable funds={filtered} /> : <div className="card p-10 text-center text-muted">טוען נתונים…</div>}</div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-muted">* תשואות נומינליות ברוטו לפני דמי ניהול. תשואה ל-3 ול-5 שנים מוצגת כממוצע שנתי. תשואות עבר אינן מעידות על תשואות עתיד. האמור אינו ייעוץ או שיווק פנסיוני.</p>
    </section>
  );
}
