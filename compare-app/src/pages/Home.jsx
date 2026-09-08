import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import QuickLinks from '../components/QuickLinks.jsx';
import ReturnCell from '../components/ReturnCell.jsx';
import RiskBadge from '../components/RiskBadge.jsx';
import ArticleCard from '../components/ArticleCard.jsx';
import LeadForm from '../components/LeadForm.jsx';
import { getMeta, topThisMonthSync } from '../data/api.js';
import { ARTICLES } from '../data/articles.js';
import { PRODUCT_LABELS, PRODUCT_ORDER, fmtFee, fmtMonthHe } from '../lib/format.js';
import { useCompare } from '../lib/compare.jsx';

export default function Home() {
  const [tab, setTab] = useState('all');
  const [meta, setMeta] = useState(null);
  const { toggle, has, full } = useCompare();
  useEffect(() => { getMeta().then(setMeta); }, []);
  const top = topThisMonthSync(tab, 6);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-line bg-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_85%_-10%,rgba(91,176,240,.18),transparent_60%),radial-gradient(600px_300px_at_5%_110%,rgba(31,111,235,.10),transparent_60%)]" />
        <div className="container-x relative py-14 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="chip mb-4 !border-ice !bg-ice !text-navy">✦ תכנון פיננסי · השוואה שקופה</span>
            <h1 className="h1">כל מוצרי החיסכון בישראל.<br /><span className="text-blue">השוואה אחת ברורה.</span></h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">קופות גמל, קרנות השתלמות, פנסיה ופוליסות חיסכון – תשואות, דמי ניהול ורמת סיכון, זה לצד זה. ואם צריך, בדיקת התאמה אישית בחינם.</p>
            <div className="mt-8"><SearchBar size="lg" /></div>
            <div className="mt-6"><QuickLinks /></div>
          </div>
        </div>
      </section>

      {/* TOP THIS MONTH */}
      <section className="container-x py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow">המסלולים המובילים החודש</span>
            <h2 className="h2 mt-1">מי הוביל ב-{meta ? fmtMonthHe(meta.asOf) : 'החודש האחרון'}?</h2>
            <p className="mt-1 text-sm text-muted">דירוג לפי תשואה חודשית. לחצי על מסלול לפרטים המלאים, או הוסיפי להשוואה.</p>
          </div>
          <div className="inline-flex flex-wrap rounded-full border border-line bg-white p-0.5">
            <button onClick={() => setTab('all')} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${tab === 'all' ? 'bg-navy text-white' : 'text-muted hover:text-navy'}`}>הכל</button>
            {PRODUCT_ORDER.map(p => <button key={p} onClick={() => setTab(p)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${tab === p ? 'bg-navy text-white' : 'text-muted hover:text-navy'}`}>{PRODUCT_LABELS[p]}</button>)}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((f, i) => (
            <div key={f.id} className="card relative p-5 transition hover:shadow-pop">
              <span className={`absolute -top-2.5 start-4 grid h-7 min-w-7 place-items-center rounded-full px-2 text-xs font-black text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-navy'}`}>#{i + 1}</span>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted"><i className="h-2.5 w-2.5 rounded-full" style={{ background: f.companyColor }} />{f.company} · {f.productName}</div>
                  <Link to={`/funds/${f.id}`} className="mt-1 block truncate text-lg font-black text-navy hover:text-blue">{f.track}</Link>
                </div>
                <ReturnCell value={f.returns.m1} badge />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-page p-2"><div className="text-muted">12 חודשים</div><ReturnCell value={f.returns.y1} /></div>
                <div className="rounded-lg bg-page p-2"><div className="text-muted">3 שנים</div><ReturnCell value={f.returns.y3} /></div>
                <div className="rounded-lg bg-page p-2"><div className="text-muted">דמי ניהול</div><b className="text-navy">{fmtFee(f.fees.accumulation)}</b></div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <RiskBadge level={f.risk} />
                <button onClick={() => toggle(f.id)} disabled={!has(f.id) && full} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${has(f.id) ? 'border-blue bg-blue text-white' : 'border-line hover:border-blue hover:bg-ice disabled:opacity-40'}`}>{has(f.id) ? '✓ בהשוואה' : '+ השוואה'}</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center"><Link to="/funds" className="btn-ghost">לטבלת ההשוואה המלאה ←</Link></div>
      </section>

      {/* WHY */}
      <section className="border-y border-line bg-white">
        <div className="container-x grid gap-6 py-14 md:grid-cols-3">
          {[
            ['השוואה בגובה העיניים', 'תשואות לשנה, 3 ו-5 שנים, דמי ניהול מצבירה ומהפקדה, רמת סיכון ויתרת נכסים – בטבלה אחת שאפשר למיין ולסנן.', 'M3 3v18h18M7 15l4-4 3 3 5-6'],
            ['עד 4 מסלולים זה לצד זה', 'בחרי מסלולים מכל טבלה, והשוואת אותם בטבלה ובגרפים – עם הדגשה של המוביל בכל פרמטר.', 'M4 6h16M4 12h16M4 18h16'],
            ['ליווי אישי, לא רק מספרים', 'מספרים הם ההתחלה. בדיקת התאמה אישית בוחנת את המצב שלך ומה באמת מתאים – בחינם וללא התחייבות.', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'],
          ].map(([t, d, icon]) => (
            <div key={t} className="flex gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-ice text-navy"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={icon} /></svg></span>
              <div><h3 className="text-lg font-black text-navy">{t}</h3><p className="mt-1 text-sm leading-relaxed text-muted">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ARTICLES */}
      <section className="container-x py-14">
        <div className="mb-6 flex items-end justify-between"><div><span className="eyebrow">תוכן מקצועי</span><h2 className="h2 mt-1">להבין לפני שמחליטים</h2></div><Link to="/articles" className="text-sm font-bold text-blue hover:underline">כל המאמרים ←</Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{ARTICLES.map(a => <ArticleCard key={a.slug} a={a} />)}</div>
      </section>

      {/* LEAD */}
      <section className="container-x pb-6" id="lead">
        <div className="grid items-center gap-8 rounded-3xl bg-navy p-6 text-white sm:p-10 lg:grid-cols-2">
          <div>
            <span className="eyebrow !text-sky">בדיקת התאמה אישית</span>
            <h2 className="mt-2 text-3xl font-black leading-tight">לא בטוחה איפה הכסף שלך צריך להיות?</h2>
            <p className="mt-3 text-slate-300">השאירי פרטים ואבדוק עבורך: האם המסלול הנוכחי מתאים, האם דמי הניהול הגיוניים, ואיפה יש מקום לשיפור. תשובה תוך יום עסקים.</p>
            <ul className="mt-5 space-y-2 text-sm text-slate-200">{['ללא עלות וללא התחייבות', 'בחינה של כל השוק – לא חברה אחת', 'שקיפות מלאה בכל שלב'].map(t => <li key={t} className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-pos text-[11px] font-black">✓</span>{t}</li>)}</ul>
          </div>
          <div className="rounded-2xl bg-white p-5 text-ink sm:p-6"><LeadForm compact /></div>
        </div>
      </section>
    </>
  );
}
