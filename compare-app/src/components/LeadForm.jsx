import { useState } from 'react';
import { submitLead } from '../data/api.js';
import { PRODUCT_LABELS, PRODUCT_ORDER } from '../lib/format.js';

export default function LeadForm({ defaultProduct = '', context = '', compact = false, onDone }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', product: defaultProduct, notes: context ? `מתעניין/ת ב: ${context}` : '' });
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle'); // idle | sending | done
  const [waUrl, setWaUrl] = useState(null);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const er = {};
    if (form.name.trim().length < 2) er.name = 'נא להזין שם מלא';
    if (!/^0\d{1,2}[-\s]?\d{7}$/.test(form.phone.replace(/\s/g, ''))) er.phone = 'נא להזין מספר טלפון ישראלי תקין';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'כתובת אימייל לא תקינה';
    if (!form.product) er.product = 'נא לבחור סוג מוצר';
    setErrors(er); return Object.keys(er).length === 0;
  };
  const submit = async e => {
    e.preventDefault(); if (!validate()) return;
    setState('sending');
    const res = await submitLead({ ...form, context, source: 'compare-site' });
    setWaUrl(res?.waUrl || null); setState('done'); onDone?.();
  };

  if (state === 'done') return (
    <div className="card p-8 text-center" role="status" aria-live="polite">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-pos-bg text-pos"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></div>
      <h3 className="text-xl font-black text-navy">תודה, {form.name.trim().split(' ')[0]}! הפנייה התקבלה.</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">אבחן את הנתונים שלך ואחזור אליך תוך יום עסקים אחד עם המלצה ראשונית – איפה כדאי להשקיע ומה שווה לבדוק. הבדיקה ללא עלות וללא התחייבות.</p>
      {waUrl && <a href={waUrl} target="_blank" rel="noopener" className="btn-primary mt-5 !bg-[#25D366] hover:!bg-[#1ebe5b]">להמשיך בוואטסאפ עכשיו ←</a>}
      <p className="mt-4 text-xs text-muted">נשלח לטלפון <b dir="ltr">{form.phone}</b>{form.email && <> ולמייל <b dir="ltr">{form.email}</b></>}</p>
    </div>
  );

  const Err = ({ k }) => errors[k] ? <p className="mt-1 text-xs font-semibold text-neg" role="alert">{errors[k]}</p> : null;
  return (
    <form onSubmit={submit} noValidate className={compact ? '' : 'card p-6 sm:p-8'}>
      {!compact && <><h3 className="text-xl font-black text-navy">בדיקת התאמה אישית – חינם</h3><p className="mb-5 mt-1 text-sm text-muted">השאירי פרטים ואחזור אליך עם המלצה מותאמת. ללא עלות וללא התחייבות.</p></>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="lf-name">שם מלא *</label><input id="lf-name" className="input" value={form.name} onChange={set('name')} autoComplete="name" required /><Err k="name" /></div>
        <div><label className="label" htmlFor="lf-phone">טלפון *</label><input id="lf-phone" className="input" dir="ltr" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="050-0000000" required /><Err k="phone" /></div>
        <div><label className="label" htmlFor="lf-email">אימייל</label><input id="lf-email" className="input" dir="ltr" type="email" value={form.email} onChange={set('email')} autoComplete="email" /><Err k="email" /></div>
        <div><label className="label" htmlFor="lf-product">סוג מוצר שמעניין אותי *</label>
          <select id="lf-product" className="input" value={form.product} onChange={set('product')} required>
            <option value="">בחרי…</option>
            {PRODUCT_ORDER.map(p => <option key={p} value={p}>{PRODUCT_LABELS[p]}</option>)}
            <option value="all">לא בטוח/ה – רוצה בדיקה כללית</option>
          </select><Err k="product" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="lf-notes">הערות</label><textarea id="lf-notes" className="input min-h-[90px]" value={form.notes} onChange={set('notes')} placeholder="למשל: צבירה נוכחית, חברה קיימת, מה חשוב לי…" /></div>
      </div>
      <button type="submit" disabled={state === 'sending'} className="btn-primary mt-5 w-full !py-3 text-base">{state === 'sending' ? 'שולח…' : 'בדקי לי איפה כדאי להשקיע'}</button>
      <p className="mt-3 text-center text-[11px] text-muted">בשליחת הטופס את/ה מאשר/ת יצירת קשר. הפרטים לא יועברו לצד שלישי.</p>
    </form>
  );
}
