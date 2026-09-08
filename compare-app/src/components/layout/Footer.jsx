import { Link } from 'react-router-dom';
import Logo from '../Logo.jsx';

export default function Footer() {
  return (
    <footer className="mt-20 bg-navy text-slate-300">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo light />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300/90">השוואה מקצועית, שקופה ונגישה של מוצרי החיסכון ארוכי-הטווח בישראל: קופות גמל, קרנות השתלמות, קרנות פנסיה ופוליסות חיסכון – תשואות, דמי ניהול, סיכון והשוואה בין מסלולים.</p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-black text-white">ניווט</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/funds">השוואת מסלולים</Link></li>
            <li><Link className="hover:text-white" to="/compare">כלי השוואה</Link></li>
            <li><Link className="hover:text-white" to="/articles">מאמרים</Link></li>
            <li><Link className="hover:text-white" to="/contact">צור קשר</Link></li>
            <li><a className="hover:text-white" href="tel:+972502423356" dir="ltr">050-242-3356</a></li>
            <li><a className="hover:text-white" href="mailto:karin@karinkeren.com">karin@karinkeren.com</a></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-black text-white">מוצרים</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/funds?product=hishtalmut">קרנות השתלמות</Link></li>
            <li><Link className="hover:text-white" to="/funds?product=gemel">קופות גמל</Link></li>
            <li><Link className="hover:text-white" to="/funds?product=pension">קרנות פנסיה</Link></li>
            <li><Link className="hover:text-white" to="/funds?product=policy">פוליסות חיסכון</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-x py-5 text-center text-xs leading-relaxed text-slate-400">
          <p>© {new Date().getFullYear()} קרין קרן – תכנון פיננסי. כל הזכויות שמורות.</p>
          <p className="mt-1">המידע באתר מוצג לצורכי מידע והשוואה בלבד ואינו מהווה ייעוץ פנסיוני, ייעוץ השקעות, שיווק פנסיוני או המלצה. תשואות עבר אינן מעידות על תשואות עתיד. הנתונים באתר הם נתוני דמו עד לחיבור למקור נתונים רשמי.</p>
        </div>
      </div>
    </footer>
  );
}
