import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReturnCell from './ReturnCell.jsx';
import RiskBadge from './RiskBadge.jsx';
import { fmtAssets, fmtFee, cx } from '../lib/format.js';
import { useCompare } from '../lib/compare.jsx';

const COLS = [
  { key: 'company', label: 'שם חברה', get: f => f.company, str: true },
  { key: 'name', label: 'שם מסלול', get: f => f.track, str: true },
  { key: 'product', label: 'סוג מוצר', get: f => f.productName, str: true },
  { key: 'risk', label: 'רמת סיכון', get: f => f.risk },
  { key: 'm1', label: 'תשואה חודשית', get: f => f.returns.m1 },
  { key: 'y1', label: 'תשואה 12 חודשים', get: f => f.returns.y1 },
  { key: 'y3', label: 'תשואה 3 שנים', get: f => f.returns.y3, hint: 'ממוצע שנתי' },
  { key: 'y5', label: 'תשואה 5 שנים', get: f => f.returns.y5, hint: 'ממוצע שנתי' },
  { key: 'feeAcc', label: 'דמי ניהול מצבירה', get: f => f.fees.accumulation },
  { key: 'feeDep', label: 'דמי ניהול מהפקדה', get: f => f.fees.deposit },
  { key: 'assets', label: 'יתרת נכסים', get: f => f.assets },
];
const PAGE = 20;

export default function FundTable({ funds, defaultSort = { key: 'y1', dir: -1 } }) {
  const [sort, setSort] = useState(defaultSort);
  const [page, setPage] = useState(1);
  const { has, toggle, full } = useCompare();

  const sorted = useMemo(() => {
    const col = COLS.find(c => c.key === sort.key);
    const arr = [...funds];
    arr.sort((a, b) => { const x = col.get(a), y = col.get(b); return col.str ? sort.dir * String(x).localeCompare(String(y), 'he') : sort.dir * (x - y); });
    return arr;
  }, [funds, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const cur = Math.min(page, pages);
  const slice = sorted.slice((cur - 1) * PAGE, cur * PAGE);

  const onSort = key => { setPage(1); setSort(s => (s.key === key ? { key, dir: -s.dir } : { key, dir: COLS.find(c => c.key === key).str ? 1 : -1 })); };

  if (!funds.length) return <div className="card p-10 text-center text-muted">לא נמצאו מסלולים התואמים את הסינון. נסי להרחיב את הקריטריונים.</div>;

  return (
    <div className="card overflow-hidden">
      <div className="table-scroll">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-page text-xs text-muted">
            <tr>
              {COLS.map(c => (
                <th key={c.key} scope="col" className={cx('whitespace-nowrap px-3 py-3 text-start font-bold', c.key === 'company' && 'sticky right-0 z-10 bg-page')}>
                  <button onClick={() => onSort(c.key)} className={cx('inline-flex items-center gap-1 hover:text-navy', sort.key === c.key && 'text-blue')} aria-sort={sort.key === c.key ? (sort.dir === -1 ? 'descending' : 'ascending') : 'none'}>
                    {c.label}<span className="text-[10px] opacity-70">{sort.key === c.key ? (sort.dir === -1 ? '▼' : '▲') : '⇅'}</span>
                  </button>
                  {c.hint && <div className="text-[10px] font-normal text-muted/80">{c.hint}</div>}
                </th>
              ))}
              <th scope="col" className="px-3 py-3 text-start text-xs font-bold">השוואה</th>
            </tr>
          </thead>
          <tbody>
            {slice.map(f => {
              const sel = has(f.id);
              return (
                <tr key={f.id} className={cx('border-t border-line transition hover:bg-ice/60', sel && 'bg-ice/70')}>
                  <td className="sticky right-0 z-10 whitespace-nowrap bg-white px-3 py-2.5 font-bold text-navy group-hover:bg-ice"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: f.companyColor }} />{f.company}</span></td>
                  <td className="px-3 py-2.5"><Link to={`/funds/${f.id}`} className="font-semibold text-blue hover:underline">{f.track}</Link></td>
                  <td className="px-3 py-2.5"><span className="chip">{f.productName}</span></td>
                  <td className="px-3 py-2.5"><RiskBadge level={f.risk} /></td>
                  <td className="px-3 py-2.5"><ReturnCell value={f.returns.m1} /></td>
                  <td className="px-3 py-2.5"><ReturnCell value={f.returns.y1} strong /></td>
                  <td className="px-3 py-2.5"><ReturnCell value={f.returns.y3} /></td>
                  <td className="px-3 py-2.5"><ReturnCell value={f.returns.y5} /></td>
                  <td className="px-3 py-2.5 font-semibold">{fmtFee(f.fees.accumulation)}</td>
                  <td className="px-3 py-2.5 font-semibold">{f.fees.deposit ? fmtFee(f.fees.deposit) : <span className="text-muted">–</span>}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted">{fmtAssets(f.assets)}</td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => toggle(f.id)} disabled={!sel && full} title={!sel && full ? 'ניתן להשוות עד 4 מסלולים' : sel ? 'הסרה מההשוואה' : 'הוספה להשוואה'}
                      className={cx('rounded-lg border px-2.5 py-1 text-xs font-bold transition', sel ? 'border-blue bg-blue text-white' : 'border-line bg-white text-navy hover:border-blue hover:bg-ice disabled:opacity-40')}>
                      {sel ? '✓ נבחר' : '+ השוואה'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-page px-4 py-3 text-xs text-muted">
        <span>מציג {(cur - 1) * PAGE + 1}–{Math.min(cur * PAGE, sorted.length)} מתוך {sorted.length} מסלולים</span>
        <div className="flex items-center gap-1">
          <button className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={cur === 1} onClick={() => setPage(p => p - 1)}>הקודם</button>
          {Array.from({ length: pages }, (_, i) => i + 1).filter(p => p === 1 || p === pages || Math.abs(p - cur) <= 1).map((p, i, arr) => (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && arr[i - 1] !== p - 1 && <span className="px-1">…</span>}
              <button onClick={() => setPage(p)} className={cx('h-8 min-w-8 rounded-lg px-2 text-xs font-bold', p === cur ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-ice')}>{p}</button>
            </span>
          ))}
          <button className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={cur === pages} onClick={() => setPage(p => p + 1)}>הבא</button>
        </div>
      </div>
    </div>
  );
}
