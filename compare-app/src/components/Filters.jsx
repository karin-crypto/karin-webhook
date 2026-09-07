import { PRODUCT_LABELS, PRODUCT_ORDER, RISK_LABELS } from '../lib/format.js';

export const EMPTY_FILTERS = { q: '', product: 'all', companies: [], track: 'all', riskMin: 1, riskMax: 5, y1Min: '', y1Max: '' };

export default function Filters({ filters, onChange, companies, tracks, resultCount }) {
  const set = patch => onChange({ ...filters, ...patch });
  const toggleCompany = id => set({ companies: filters.companies.includes(id) ? filters.companies.filter(c => c !== id) : [...filters.companies, id] });
  const isDirty = JSON.stringify({ ...filters, q: '' }) !== JSON.stringify({ ...EMPTY_FILTERS, q: '' });
  return (
    <aside className="card p-4 lg:sticky lg:top-20">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-black text-navy">סינון</h2>
        {isDirty && <button onClick={() => onChange({ ...EMPTY_FILTERS, q: filters.q })} className="text-xs font-bold text-blue hover:underline">נקה סינון</button>}
      </div>
      <div className="mb-4 text-xs text-muted">{resultCount} מסלולים מתאימים</div>

      <fieldset className="mb-4">
        <legend className="label">סוג מוצר</legend>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => set({ product: 'all', track: 'all' })} className={`rounded-full px-3 py-1 text-xs font-bold ${filters.product === 'all' ? 'bg-navy text-white' : 'bg-page text-muted hover:bg-ice'}`}>הכל</button>
          {PRODUCT_ORDER.map(p => <button key={p} onClick={() => set({ product: p, track: 'all' })} className={`rounded-full px-3 py-1 text-xs font-bold ${filters.product === p ? 'bg-navy text-white' : 'bg-page text-muted hover:bg-ice'}`}>{PRODUCT_LABELS[p]}</button>)}
        </div>
      </fieldset>

      <div className="mb-4">
        <label className="label" htmlFor="f-track">מסלול השקעה</label>
        <select id="f-track" className="input" value={filters.track} onChange={e => set({ track: e.target.value })}>
          <option value="all">כל המסלולים</option>
          {tracks.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <fieldset className="mb-4">
        <legend className="label">רמת סיכון</legend>
        <div className="flex items-center gap-2">
          <select className="input" aria-label="סיכון מינימלי" value={filters.riskMin} onChange={e => set({ riskMin: +e.target.value, riskMax: Math.max(+e.target.value, filters.riskMax) })}>
            {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} – {RISK_LABELS[r]}</option>)}
          </select>
          <span className="text-muted">עד</span>
          <select className="input" aria-label="סיכון מקסימלי" value={filters.riskMax} onChange={e => set({ riskMax: +e.target.value, riskMin: Math.min(+e.target.value, filters.riskMin) })}>
            {[1, 2, 3, 4, 5].map(r => <option key={r} value={r}>{r} – {RISK_LABELS[r]}</option>)}
          </select>
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="label">תשואה 12 חודשים (%)</legend>
        <div className="flex items-center gap-2">
          <input className="input" type="number" step="0.5" inputMode="decimal" placeholder="מ-" aria-label="תשואה מינימלית" value={filters.y1Min} onChange={e => set({ y1Min: e.target.value })} />
          <span className="text-muted">–</span>
          <input className="input" type="number" step="0.5" inputMode="decimal" placeholder="עד" aria-label="תשואה מקסימלית" value={filters.y1Max} onChange={e => set({ y1Max: e.target.value })} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">חברה מנהלת</legend>
        <div className="max-h-56 space-y-1 overflow-auto pe-1">
          {companies.map(c => (
            <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm hover:bg-page">
              <input type="checkbox" className="accent-blue" checked={filters.companies.includes(c.id)} onChange={() => toggleCompany(c.id)} />
              <i className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
              <span className="font-semibold text-ink">{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </aside>
  );
}
