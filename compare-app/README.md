# קרין קרן – תכנון פיננסי · אתר השוואת מוצרי חיסכון

אתר React (Vite) בעברית מלאה ו-RTL להשוואת **קופות גמל, קרנות השתלמות, קרנות פנסיה ופוליסות חיסכון**:
תשואות (חודש / 12 חודשים / 3 שנים / 5 שנים), דמי ניהול מצבירה ומהפקדה, רמת סיכון, יתרת נכסים, גרפים, סינון, מיון, עמודי פרטים, כלי השוואה של עד 4 מסלולים וטופס לידים.

> **חשוב:** הנתונים באתר הם **נתוני דמו ריאליסטיים** שנוצרים באופן דטרמיניסטי (`scripts/generate-data.mjs`).
> הם אינם נתוני אמת. שכבת הנתונים (`src/data/api.js`) בנויה להחלפה בחיבור ל-API אמיתי.

---

## הרצה מקומית

דרישות: Node.js 18 ומעלה.

```bash
cd compare-app
npm install
npm run dev
```

הדפדפן: http://localhost:5173

## בנייה לפרודקשן

```bash
npm run build      # יוצר תיקיית dist/
npm run preview    # תצוגה מקדימה של הבנייה ב-http://localhost:4173
```

`dist/` היא תיקייה סטטית שאפשר להעלות לכל אחסון סטטי (Vercel, Netlify, Railway, S3, nginx…).
מכיוון שזה SPA עם React Router, **צריך fallback ל-`index.html`** בשרת (ראו למטה).

### שילוב בשרת ה-Express הקיים (karin-webhook)

ב-`index.js` של השרת הראשי, אחרי `express.static(public)`:

```js
// Serve the comparison app (built with `npm run build` inside compare-app/)
const compareDist = path.join(__dirname, 'compare-app', 'dist');
app.use(express.static(compareDist));
app.get(/^\/(funds|compare|articles|contact)(\/.*)?$/, (req, res) => res.sendFile(path.join(compareDist, 'index.html')));
```

אם האתר יוצב תחת תת-נתיב (למשל `/app/`), שנו `base: '/app/'` ב-`vite.config.js` והתאימו את הנתיבים.

---

## מבנה הקוד

```
compare-app/
├── index.html                 # RTL, lang=he, גופן Heebo
├── vite.config.js
├── tailwind.config.js         # פלטת המותג: navy / blue / sky / pos (ירוק) / neg (אדום)
├── scripts/
│   └── generate-data.mjs      # מחולל נתוני דמו -> src/data/funds.json   (npm run data:generate)
└── src/
    ├── main.jsx               # BrowserRouter + CompareProvider
    ├── App.jsx                # ניתוב
    ├── index.css              # Tailwind + קלאסים משותפים (.card .btn-primary .input …)
    ├── data/
    │   ├── funds.json         # נתוני הדמו (153 מסלולים, היסטוריה חודשית של 5 שנים)
    │   ├── api.js             # ★ שכבת הנתונים – כאן מחברים API אמיתי
    │   └── articles.js        # 4 מאמרים מקצועיים
    ├── lib/
    │   ├── format.js          # פורמט אחוזים/דמי ניהול/נכסים, תוויות סיכון ומוצרים
    │   └── compare.jsx        # Context לבחירת עד 4 מסלולים (נשמר ב-localStorage)
    ├── components/
    │   ├── layout/            # Header, Footer, Layout
    │   ├── charts/            # ReturnsChart, AllocationChart, CompareBarChart, CompareLineChart (Recharts)
    │   ├── SearchBar.jsx      # חיפוש עם השלמה אוטומטית
    │   ├── QuickLinks.jsx     # כפתורים מהירים לפי מוצר
    │   ├── Filters.jsx        # סינון: מוצר, חברה, מסלול, סיכון, טווח תשואה
    │   ├── FundTable.jsx      # טבלה מקצועית: מיון לפי כל עמודה, עימוד, כפתור השוואה
    │   ├── CompareBar.jsx     # סרגל השוואה צף
    │   ├── LeadForm.jsx       # טופס ליד עם ולידציה והודעת תודה
    │   ├── ReturnCell.jsx     # תשואה בירוק/אדום
    │   ├── RiskBadge.jsx, StatCard.jsx, ArticleCard.jsx, Logo.jsx
    └── pages/
        ├── Home.jsx           # חיפוש מרכזי, כפתורים מהירים, "המסלולים המובילים החודש", מאמרים, ליד
        ├── Funds.jsx          # /funds – טבלת ההשוואה + סינון (מסונכרן עם ה-URL)
        ├── FundDetail.jsx     # /funds/:id – פרטי מסלול, גרף תשואות, הרכב, "בדיקת התאמה אישית"
        ├── CompareTool.jsx    # /compare – עד 4 מסלולים: טבלה + גרפים + הדגשת המוביל
        ├── Articles.jsx, Article.jsx, Contact.jsx, NotFound.jsx
```

## מודל הנתונים (מסלול)

```js
{
  id, company, companyId, companyColor, name,
  product: 'gemel' | 'hishtalmut' | 'pension' | 'policy', productName,
  track, trackId, risk: 1..5,
  returns: { m1, y1, y3, y5 },            // אחוזים; y3/y5 = ממוצע שנתי
  fees: { accumulation, deposit },         // אחוזים
  assets,                                  // ₪ מיליונים
  allocation: { stocks, bonds, cash, alt },// אחוזים
  history: [{ date: 'YYYY-MM', value }],   // 60 נקודות חודשיות (ערך יחידה, בסיס 100)
  sharpe, updated
}
```

## חיבור ל-API אמיתי

כל הגישה לנתונים עוברת דרך `src/data/api.js`. כדי לחבר מקור אמיתי (למשל ייצוא גמל-נט / רשות שוק ההון):

1. החליפו את גוף הפונקציות `getFunds`, `getFund`, `getFundsByIds`, `getMeta`, `getCompanies` בקריאות `fetch()` ל-API שלכם, והחזירו אובייקטים במודל שלמעלה.
2. עדכנו את `submitLead` כך שישלח ל-CRM / מייל / WhatsApp (כרגע מנסה `POST /api/contact` ונופל ל-console).
3. `searchFundsSync` ו-`topThisMonthSync` עובדים על הרשימה המקומית; אם ה-API מחזיר את כל המסלולים בטעינה, הם ימשיכו לעבוד כפי שהם.

## עיצוב ונגישות

- פלטה: לבן, כחול כהה `#0B2545`, כחול `#1F6FEB`, תכלת `#5BB0F0`, ירוק עדין `#1E9E6A` (תשואה חיובית), אדום עדין `#D9534F` (תשואה שלילית).
- RTL מלא, מספרים ב-`tabular-nums`, מצבי פוקוס ברורים, תוויות ARIA לחיפוש/טבלה/מודאל.
- מותאם למובייל: סינון מתקפל, טבלאות עם גלילה אופקית ועמודת חברה דביקה.

## רישוי ומקוריות

העיצוב, הטקסטים, הלוגו והקוד נכתבו במקור עבור "קרין קרן – תכנון פיננסי". שמות החברות המנהלות הם שמות עובדתיים של גופים בשוק ומשמשים כנתוני תיוג בלבד.
