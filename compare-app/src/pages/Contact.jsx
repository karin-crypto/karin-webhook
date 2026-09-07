import LeadForm from '../components/LeadForm.jsx';
export default function Contact() {
  return (
    <section className="container-x py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <span className="eyebrow">צור קשר</span>
          <h1 className="h2 mt-1">בואי נבדוק איפה כדאי להשקיע</h1>
          <p className="mt-3 leading-relaxed text-muted">אני קרין קרן, מתכננת פיננסית. אני עובדת עם כל השוק ולא עם חברה אחת – ולכן הבדיקה שלי מסתכלת על מה שמתאים לך: המסלול, דמי הניהול, רמת הסיכון וההרכב הכולל של החיסכון.</p>
          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-ice">📞</span><a className="font-bold text-navy hover:text-blue" href="tel:+972500000000" dir="ltr">050-000-0000</a></li>
            <li className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-ice">✉️</span><a className="font-bold text-navy hover:text-blue" href="mailto:karin@example.com">karin@example.com</a></li>
            <li className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-ice">📍</span><span className="font-bold text-navy">פגישות בזום או פנים אל פנים</span></li>
          </ul>
          <div className="mt-8 rounded-2xl border border-line bg-white p-4 text-xs leading-relaxed text-muted">המידע שתשאירי ישמש ליצירת קשר בלבד ולא יועבר לצד שלישי. הבדיקה אינה מהווה ייעוץ פנסיוני; המלצה מפורטת תינתן לאחר שיחת התאמה.</div>
        </div>
        <LeadForm />
      </div>
    </section>
  );
}
