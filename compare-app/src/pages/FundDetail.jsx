import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ReturnsChart from '../components/charts/ReturnsChart.jsx';
import AllocationChart from '../components/charts/AllocationChart.jsx';
import StatCard from '../components/StatCard.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import ReturnCell from '../components/ReturnCell.jsx';
import LeadForm from '../components/LeadForm.jsx';
import { getFund, getFunds } from '../data/api.js';
import { RISK_LABELS, fmtAssets, fmtFee, fmtMonthHe } from '../lib/format.js';
import { useCompare } from '../lib/compare.jsx';

export default function FundDetail() {
  const { id } = useParams();
  const [fund, setFund] = useState(undefined);
  const [peers, setPeers] = useState([]);
  const [modal, setModal] = useState(false);
  const { has, toggle, full } = useCompare();

  useEffect(() => {
    let on = true;
    getFund(id).then(f => { if (!on) return; setFund(f); if (f) getFunds().then(all => on && setPeers(all.filter(p => p.product === f.product && p.track === f.track && p.id !== f.id).sort((a, b) => b.returns.y1 - a.returns.y1).slice(0, 5))); });
    return () => { on = false; };
  }, [id]);
  useEffect(() => { document.body.style.overflow = modal ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [modal]);

  if (fund === undefined) return <div className="container-x py-20 text-center text-muted">טוען…</div>;
  if (fund === null) return <div className="container-x py-20 text-center"><h1 className="h2">המסלול לא נמצא</h1><Link to="/funds" className="btn-primary mt-6">לטבלת ההשוואה</Link></div>;

  const periods = [['תשואה חודשית', fund.returns.m1], ['12 חודשים', fund.returns.y1], ['3 שנים (שנתי)', fund.returns.y3], ['5 שנים (שנתי)', fund.returns.y5]];
  return (
    <section className="container-x py-8 sm:py-10">
      <nav className="mb-4 text-xs text-muted" aria-label="פירורי לחם"><Link to="/" className="hover:text-navy">בית</Link> › <Link to={`/funds?product=${fund.product}`} className="hover:text-navy">{fund.productName}</Link> › <span className="text-navy">{fund.track}</span></nav>

      <div className="card flex flex-wrap items-start justify-between gap-5 p-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted"><i className="h-3 w-3 rounded-full" style={{ background: fund.companyColor }} /><b className="text-ink">{fund.company}</b><span>·</span><span className="chip">{fund.productName}</span></div>
          <h1 className="mt-2 text-2xl font-black text-navy sm:text-3xl">{fund.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm"><RiskBadge level={fund.risk} /><span className="text-muted">עדכון אחרון: {fmtMonthHe(fund.updated)}</span></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => toggle(fund.id)} disabled={!has(fund.id) && full} className={has(fund.id) ? 'btn-navy' : 'btn-ghost'}>{has(fund.id) ? '✓ בהשוואה' : '+ הוספה להשוואה'}</button>
          <button onClick={() => setModal(true)} className="btn-primary">בדיקת התאמה אישית</button>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {periods.map(([l, v]) => <StatCard key={l} label={l} pct={v} />)}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <StatCard label="דמי ניהול מצבירה" value={fmtFee(fund.fees.accumulation)} sub="לשנה, מהיתרה הצבורה" />
        <StatCard label="דמי ניהול מהפקדה" value={fund.fees.deposit ? fmtFee(fund.fees.deposit) : 'ללא'} sub="מכל הפקדה שוטפת" />
        <StatCard label="יתרת נכסים" value={fmtAssets(fund.assets)} sub={`מדד שארפ ${fund.sharpe}`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ReturnsChart history={fund.history} />
        <AllocationChart allocation={fund.allocation} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-base font-black text-navy">רמת סיכון: {RISK_LABELS[fund.risk]} ({fund.risk}/5)</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">{fund.risk >= 4 ? 'מסלול בעל חשיפה מנייתית גבוהה. פוטנציאל תשואה גבוה לאורך זמן לצד תנודתיות משמעותית בטווח הקצר. מתאים לטווח חיסכון ארוך וליכולת ספיגת ירידות.' : fund.risk === 3 ? 'מסלול מאוזן המשלב מניות, אג"ח ונכסים נוספים. תנודתיות בינונית – ברירת המחדל של רוב החוסכים לטווח בינוני-ארוך.' : 'מסלול סולידי עם חשיפה נמוכה למניות. תנודתיות נמוכה ופוטנציאל תשואה מוגבל. מתאים לטווח קצר או לרתיעה מסיכון.'}</p>
          <div className="mt-4 rounded-xl bg-page p-3 text-xs text-muted">מדד שארפ <b className="text-navy">{fund.sharpe}</b> – תשואה עודפת ליחידת סיכון. ערך גבוה יותר = תשואה טובה יותר ביחס לתנודתיות.</div>
        </div>
        <div className="card p-5">
          <h3 className="text-base font-black text-navy">מסלולים דומים להשוואה</h3>
          <p className="mb-3 text-xs text-muted">{fund.productName} · {fund.track} בחברות אחרות</p>
          <ul className="divide-y divide-line">
            {peers.map(p => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <Link to={`/funds/${p.id}`} className="flex items-center gap-2 font-semibold text-ink hover:text-blue"><i className="h-2.5 w-2.5 rounded-full" style={{ background: p.companyColor }} />{p.company}</Link>
                <span className="flex items-center gap-3 text-xs"><span className="text-muted">12 ח׳</span><ReturnCell value={p.returns.y1} /><button onClick={() => toggle(p.id)} disabled={!has(p.id) && full} className={`rounded-md border px-2 py-0.5 font-bold ${has(p.id) ? 'border-blue bg-blue text-white' : 'border-line hover:border-blue disabled:opacity-40'}`}>{has(p.id) ? '✓' : '+'}</button></span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">* הנתונים לצורכי מידע והשוואה בלבד. תשואות נומינליות ברוטו; תשואות ל-3 ול-5 שנים כממוצע שנתי. תשואות עבר אינן מעידות על תשואות עתיד. האמור אינו ייעוץ פנסיוני או שיווק פנסיוני.</p>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="בדיקת התאמה אישית" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="relative w-full max-w-2xl">
            <button onClick={() => setModal(false)} aria-label="סגירה" className="absolute -top-3 end-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-lg font-black text-navy shadow-pop">×</button>
            <LeadForm defaultProduct={fund.product} context={fund.name} />
          </div>
        </div>
      )}
    </section>
  );
}
