import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CompareBarChart from '../components/charts/CompareBarChart.jsx';
import CompareLineChart from '../components/charts/CompareLineChart.jsx';
import ReturnCell from '../components/ReturnCell.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import { getFundsByIds } from '../data/api.js';
import { fmtAssets, fmtFee, cx } from '../lib/format.js';
import { useCompare } from '../lib/compare.jsx';
import { SERIES } from '../components/charts/chartTheme.js';

const ROWS = [
  { label: 'תשואה חודשית', get: f => f.returns.m1, render: v => <ReturnCell value={v} />, best: 'max' },
  { label: 'תשואה 12 חודשים', get: f => f.returns.y1, render: v => <ReturnCell value={v} strong />, best: 'max' },
  { label: 'תשואה 3 שנים (שנתי)', get: f => f.returns.y3, render: v => <ReturnCell value={v} />, best: 'max' },
  { label: 'תשואה 5 שנים (שנתי)', get: f => f.returns.y5, render: v => <ReturnCell value={v} />, best: 'max' },
  { label: 'מדד שארפ', get: f => f.sharpe, render: v => <b>{v}</b>, best: 'max' },
  { label: 'דמי ניהול מצבירה', get: f => f.fees.accumulation, render: v => <b>{fmtFee(v)}</b>, best: 'min' },
  { label: 'דמי ניהול מהפקדה', get: f => f.fees.deposit, render: v => <b>{v ? fmtFee(v) : 'ללא'}</b>, best: 'min' },
  { label: 'רמת סיכון', get: f => f.risk, render: v => <RiskBadge level={v} />, best: null },
  { label: 'יתרת נכסים', get: f => f.assets, render: v => <span>{fmtAssets(v)}</span>, best: 'max' },
];

export default function CompareTool() {
  const { ids, remove, clear, max } = useCompare();
  const [funds, setFunds] = useState([]);
  useEffect(() => { let on = true; getFundsByIds(ids).then(f => on && setFunds(f)); return () => { on = false; }; }, [ids]);

  if (!ids.length) return (
    <section className="container-x py-20 text-center">
      <span className="eyebrow">כלי השוואה</span>
      <h1 className="h2 mt-2">עוד לא בחרת מסלולים להשוואה</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">בטבלת ההשוואה לחצי על "+ השוואה" ליד עד {max} מסלולים, וחזרי לכאן כדי לראות אותם זה לצד זה – בטבלה ובגרפים.</p>
      <Link to="/funds" className="btn-primary mt-6">לטבלת המסלולים ←</Link>
    </section>
  );

  const bestIdx = row => {
    if (!row.best || funds.length < 2) return -1;
    const vals = funds.map(row.get);
    const target = row.best === 'max' ? Math.max(...vals) : Math.min(...vals);
    return vals.filter(v => v === target).length === 1 ? vals.indexOf(target) : -1;
  };
  const wins = funds.map((_, i) => ROWS.filter(r => bestIdx(r) === i).length);
  const leader = wins.indexOf(Math.max(...wins));

  return (
    <section className="container-x py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><span className="eyebrow">כלי השוואה</span><h1 className="h2 mt-1">{funds.length} מסלולים זה לצד זה</h1><p className="mt-1 text-sm text-muted">🏆 מסמן את הערך הטוב ביותר בכל שורה. ניתן להשוות עד {max} מסלולים.</p></div>
        <div className="flex gap-2">{ids.length < max && <Link to="/funds" className="btn-ghost">+ הוספת מסלול</Link>}<button onClick={clear} className="btn-ghost">נקה הכל</button></div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-page">
                <th className="w-44 px-4 py-4 text-start text-xs font-bold text-muted">פרמטר</th>
                {funds.map((f, i) => (
                  <th key={f.id} className="px-4 py-4 text-start align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-xs text-muted"><i className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES[i] }} />{f.company}</div>
                        <Link to={`/funds/${f.id}`} className="mt-0.5 block font-black text-navy hover:text-blue">{f.track}</Link>
                        <span className="chip mt-1 !py-0">{f.productName}</span>
                        {i === leader && wins[i] > 0 && <div className="mt-1.5 text-[11px] font-bold text-pos">מוביל ב-{wins[i]} פרמטרים</div>}
                      </div>
                      <button onClick={() => remove(f.id)} aria-label="הסרה מההשוואה" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-muted hover:bg-neg-bg hover:text-neg">×</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(r => { const b = bestIdx(r); return (
                <tr key={r.label} className="border-t border-line">
                  <th scope="row" className="px-4 py-3 text-start text-xs font-bold text-muted">{r.label}</th>
                  {funds.map((f, i) => <td key={f.id} className={cx('px-4 py-3', i === b && 'bg-pos-bg/60')}>{r.render(r.get(f))}{i === b && <span className="ms-1.5 text-xs" title="הערך הטוב ביותר">🏆</span>}</td>)}
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>

      {funds.length >= 2 && <div className="mt-6 grid gap-6 lg:grid-cols-2"><CompareBarChart funds={funds} /><CompareLineChart funds={funds} /></div>}
      <div className="mt-8 rounded-2xl bg-ice p-5 text-center"><p className="font-bold text-navy">רוצה לדעת איזה מהם מתאים לך באמת?</p><Link to="/contact" className="btn-primary mt-3">בדקי לי איפה כדאי להשקיע</Link></div>
      <p className="mt-6 text-xs leading-relaxed text-muted">* תשואות נומינליות ברוטו; 3 ו-5 שנים כממוצע שנתי. תשואות עבר אינן מעידות על תשואות עתיד. האמור אינו ייעוץ או שיווק פנסיוני.</p>
    </section>
  );
}
