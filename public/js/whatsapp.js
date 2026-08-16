/* =========================================================
   תבניות וואטסאפ – ספריית הודעות + מילוי אוטומטי
   Fills {tokens} from the recipient fields, lets Karin tweak
   each message, then copy it or open it straight in WhatsApp.
   ========================================================= */
'use strict';

/* token → field id */
const TOKENS = {
  '{שם}':    'v-name',
  '{תאריך}': 'v-date',
  '{שעה}':   'v-time',
  '{סכום}':  'v-amount',
  '{נושא}':  'v-topic',
};

const CATS = [
  { key: 'all',       label: 'הכל',            emoji: '✦' },
  { key: 'welcome',   label: 'קבלת פנים',      emoji: '👋' },
  { key: 'meeting',   label: 'פגישות',         emoji: '📅' },
  { key: 'documents', label: 'מסמכים',         emoji: '📎' },
  { key: 'followup',  label: 'מעקב',           emoji: '🔄' },
  { key: 'updates',   label: 'עדכונים ודוחות', emoji: '📊' },
  { key: 'payment',   label: 'תשלומים',        emoji: '💳' },
  { key: 'greetings', label: 'ברכות',          emoji: '🎉' },
];

/* the message library. Body uses {tokens}. Sign-off: קרן קרן */
const TEMPLATES = [
  { id: 'welcome-new', cat: 'welcome', emoji: '👋', title: 'ברוך/ה הבא/ה — לקוח חדש',
    body: 'שלום {שם}, נעים מאוד! 😊\nכאן קרן קרן, הסוכנת הפנסיונית שלך.\nשמחה שהצטרפת אליי. אני כאן לכל שאלה, ליווי ותכנון פיננסי חכם לאורך הדרך.\nבימים הקרובים אעדכן אותך בשלבים הבאים. בינתיים — מוזמן/ת לשמור את המספר שלי. 🙏\nקרן קרן' },

  { id: 'welcome-intro-call', cat: 'welcome', emoji: '☎️', title: 'הצעה לשיחת היכרות',
    body: 'היי {שם} 😊\nאשמח לקבוע איתך שיחת היכרות קצרה (כ‑20 דקות) כדי להכיר את התמונה הפיננסית שלך ולראות איך אפשר לעזור.\nמתי נוח לך השבוע? אפשר גם טלפונית וגם בזום.\nקרן קרן' },

  { id: 'meeting-propose', cat: 'meeting', emoji: '📅', title: 'הצעת מועד לפגישה',
    body: 'היי {שם},\nאשמח לקבוע איתנו פגישה לגבי {נושא}.\nמתאים לך ב{תאריך} בשעה {שעה}?\nאם לא — תשלח/י לי 2–3 חלונות שנוחים לך ואתאם בהתאם. 🙂\nקרן קרן' },

  { id: 'meeting-confirm', cat: 'meeting', emoji: '✅', title: 'אישור פגישה',
    body: 'מעולה {שם}! 🎯\nסגרנו פגישה ל{תאריך} בשעה {שעה}.\nהפגישה תעסוק ב{נושא}. אשלח תזכורת יום לפני.\nאם משהו משתנה — פשוט עדכני/עדכן אותי.\nנתראה! קרן קרן' },

  { id: 'meeting-reminder', cat: 'meeting', emoji: '⏰', title: 'תזכורת לפגישה (יום לפני)',
    body: 'תזכורת קטנה 🙂\nהיי {שם}, מזכירה שנפגשים מחר, {תאריך}, בשעה {שעה}.\nבנושא: {נושא}.\nאם תוכל/י להביא את המסמכים הרלוונטיים — נתקדם מהר יותר.\nמחכה לראותך! קרן קרן' },

  { id: 'meeting-thanks', cat: 'meeting', emoji: '🙏', title: 'תודה אחרי פגישה',
    body: 'תודה על הפגישה {שם}! היה לי ממש נעים. 😊\nכפי שסיכמנו, אני מטפלת בנושא {נושא} ואחזור אליך עם עדכון בהקדם.\nכל שאלה שעולה בינתיים — אני כאן.\nקרן קרן' },

  { id: 'docs-request', cat: 'documents', emoji: '📎', title: 'בקשת מסמכים',
    body: 'היי {שם} 🙂\nכדי להתקדם עם {נושא} אשמח לקבל את המסמכים הבאים:\n1. צילום תעודת זהות\n2. תלוש שכר אחרון\n3. דוח פנסיוני / אישור יתרות עדכני\n\nאפשר לשלוח לי הכל כאן בוואטסאפ. תודה רבה! 🙏\nקרן קרן' },

  { id: 'docs-received', cat: 'documents', emoji: '📥', title: 'אישור קבלת מסמכים',
    body: 'קיבלתי, תודה {שם}! ✅\nהמסמכים אצלי ואני מתחילה לטפל ב{נושא}.\nאעדכן אותך ברגע שיש חדש. אם חסר משהו — אחזור אליך.\nקרן קרן' },

  { id: 'docs-signature', cat: 'documents', emoji: '✍️', title: 'בקשת חתימה',
    body: 'היי {שם},\nהכנתי עבורך את הטופס ל{נושא}. נשאר רק לחתום. ✍️\nאשלח לך קישור לחתימה דיגיטלית — זה לוקח דקה מהנייד.\nברגע שנחתום, אני ממשיכה בתהליך. תודה! 🙏\nקרן קרן' },

  { id: 'followup-checkin', cat: 'followup', emoji: '🔄', title: 'חזרה ללקוח / מעקב',
    body: 'היי {שם} 🙂\nרק בודקת מה שלומך ואם יש התקדמות בנושא {נושא} שדיברנו עליו.\nאם נוח לך שנקבע שיחה קצרה כדי לסגור פינות — אני זמינה. אין לחץ, פשוט לא רוצה שזה ייפול בין הכיסאות.\nקרן קרן' },

  { id: 'followup-noanswer', cat: 'followup', emoji: '📞', title: 'ניסיון יצירת קשר (לא ענו)',
    body: 'היי {שם}, ניסיתי להשיג אותך טלפונית ולא הצלחתי. 📞\nאשמח לחזור אליך בנוגע ל{נושא}.\nמתי נוח לך שאתקשר? אפשר גם פשוט להשיב לי כאן. 🙂\nקרן קרן' },

  { id: 'update-annual', cat: 'updates', emoji: '📊', title: 'דוח שנתי מוכן',
    body: 'בשורה טובה {שם}! 📊\nהכנתי עבורך דוח מצב פיננסי מסודר לשנה החולפת — כולל פוליסות, צבירות ותשואות.\nאשמח לעבור עליו איתך יחד ולראות אם כדאי לבצע התאמות. מתי נוח לך?\nקרן קרן' },

  { id: 'update-yield', cat: 'updates', emoji: '📈', title: 'עדכון תשואות',
    body: 'עדכון קטן ומשמח 📈\nהיי {שם}, בדקתי את התיק שלך והתשואות ממשיכות במגמה חיובית.\nב{נושא} נרשמה תשואה יפה בתקופה האחרונה. שווה שנשוחח על אופטימיזציה של דמי הניהול.\nזמינה לכל שאלה, קרן קרן' },

  { id: 'update-review', cat: 'updates', emoji: '🔎', title: 'הצעה לבדיקת תיק תקופתית',
    body: 'היי {שם} 🙂\nעבר קצת זמן מאז שעברנו על התיק הפנסיוני שלך. מומלץ לעשות בדיקה תקופתית — לוודא שהמסלולים, הכיסויים ודמי הניהול עדיין מתאימים לך.\nהבדיקה ללא עלות וללא התחייבות. נקבע?\nקרן קרן' },

  { id: 'payment-reminder', cat: 'payment', emoji: '💳', title: 'תזכורת תשלום',
    body: 'היי {שם} 🙂\nתזכורת ידידותית: התשלום עבור {נושא} בסך {סכום} ממתין להסדרה עד {תאריך}.\nאם כבר טיפלת — התעלמ/י מההודעה ותודה. אם צריך עזרה, אני כאן.\nקרן קרן' },

  { id: 'payment-thanks', cat: 'payment', emoji: '🧾', title: 'אישור תשלום',
    body: 'התקבל, תודה {שם}! 🧾\nהתשלום בסך {סכום} עבור {נושא} נקלט בהצלחה.\nהכל מסודר. אשמור לך אישור בתיק. יום נעים! 😊\nקרן קרן' },

  { id: 'greet-birthday', cat: 'greetings', emoji: '🎂', title: 'ברכת יום הולדת',
    body: 'מזל טוב {שם}! 🎂🎉\nיום הולדת שמח מכל הלב!\nשתהיה לך שנה של בריאות, שמחה, שקט כלכלי והגשמת חלומות.\nגאה להיות הסוכנת שלך. חוגגים! 🥳\nקרן קרן' },

  { id: 'greet-holiday', cat: 'greetings', emoji: '🍎', title: 'ברכה לחג',
    body: 'שלום {שם} 🍎🍯\nרוצה לאחל לך ולמשפחה חג שמח ומבורך!\nשתהיה שנה טובה, בריאה ומתוקה — עם הרבה נחת ושגשוג.\nתודה על האמון. חג שמח!\nקרן קרן' },

  { id: 'greet-newyear', cat: 'greetings', emoji: '🎊', title: 'ברכת שנה טובה',
    body: 'שנה טובה {שם}! 🎊\nשתהיה שנה של בריאות, אושר, יציבות כלכלית וצמיחה.\nתודה שאת/ה חלק מהמשפחה שלי. כאן בשבילך גם השנה. 🙏\nבברכה, קרן קרן' },
];

/* per-template dirty flag: true once Karin edited the textarea */
const dirty = {};
let activeCat = 'all';

/* ---------- token filling ---------- */
function fieldVal(id) { return document.getElementById(id).value.trim(); }

function fillTokens(body) {
  let out = body;
  for (const [token, fieldId] of Object.entries(TOKENS)) {
    const v = fieldVal(fieldId);
    if (v) out = out.split(token).join(v);
  }
  return out;
}

/* ---------- render filters ---------- */
function renderFilters() {
  const wrap = document.getElementById('waFilters');
  wrap.innerHTML = CATS.map(c => {
    const count = c.key === 'all' ? TEMPLATES.length : TEMPLATES.filter(t => t.cat === c.key).length;
    return `<button class="wa-chip ${c.key === activeCat ? 'active' : ''}" onclick="setCat('${c.key}')">
      ${c.emoji} ${c.label} <span class="cnt">${count}</span>
    </button>`;
  }).join('');
}

function setCat(key) { activeCat = key; renderFilters(); renderCards(); }

/* ---------- render cards ---------- */
function catLabel(key) { const c = CATS.find(x => x.key === key); return c ? c.label : ''; }

function renderCards() {
  const grid = document.getElementById('waGrid');
  const list = TEMPLATES.filter(t => activeCat === 'all' || t.cat === activeCat);
  const now = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  grid.innerHTML = list.map(t => `
    <div class="wa-card" data-id="${t.id}">
      <div class="wa-card-head">
        <div class="wa-card-emoji">${t.emoji}</div>
        <h3>${t.title}</h3>
        <span class="wa-card-cat">${catLabel(t.cat)}</span>
      </div>
      <div class="wa-bubble-wrap">
        <div class="wa-bubble">
          <textarea rows="6" oninput="markDirty('${t.id}')">${esc(fillTokens(t.body))}</textarea>
          <span class="wa-bubble-time">${now} ✓✓</span>
        </div>
      </div>
      <div class="wa-card-actions">
        <button class="btn btn-outline btn-sm" onclick="copyMsg('${t.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          העתקה
        </button>
        <button class="btn btn-wa btn-sm" onclick="openWa('${t.id}')">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.31-1.96 1.35-.5.04-.5.4-3.15-.66-2.65-1.06-4.3-3.77-4.43-3.95-.13-.18-1.05-1.4-1.05-2.67s.66-1.89.9-2.15c.24-.26.52-.32.7-.32.17 0 .35 0 .5.01.16.01.38-.06.59.45.24.58.82 2 .89 2.14.07.14.12.31.02.5-.09.18-.14.29-.28.45-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.18.69-.8.87-1.08.18-.28.36-.23.61-.14.24.09 1.55.73 1.82.86.27.14.44.2.5.31.07.11.07.63-.17 1.31z"/></svg>
          וואטסאפ
        </button>
      </div>
    </div>`).join('') ||
    '<div class="empty wa-empty">אין תבניות בקטגוריה הזו.</div>';
}

/* keep manual edits when fields change */
function markDirty(id) { dirty[id] = true; }

function getText(id) {
  const card = document.querySelector(`.wa-card[data-id="${id}"] textarea`);
  return card ? card.value : '';
}

/* re-fill only the cards Karin hasn't manually edited */
function refillCards() {
  document.querySelectorAll('.wa-card').forEach(card => {
    const id = card.dataset.id;
    if (dirty[id]) return;
    const t = TEMPLATES.find(x => x.id === id);
    const ta = card.querySelector('textarea');
    if (t && ta) ta.value = fillTokens(t.body);
  });
}

/* ---------- actions ---------- */
async function copyMsg(id) {
  const text = getText(id);
  try {
    await navigator.clipboard.writeText(text);
    toast('ההודעה הועתקה ✓');
  } catch {
    // fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
    toast('ההודעה הועתקה ✓');
  }
}

function formatPhoneIL(phone) {
  const d = String(phone).replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('972')) return d;
  if (d.startsWith('0'))   return '972' + d.slice(1);
  return '972' + d;
}

function openWa(id) {
  const text = encodeURIComponent(getText(id));
  const phone = formatPhoneIL(fieldVal('v-phone'));
  const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank', 'noopener');
}

/* ---------- utils ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------- init ---------- */
document.querySelectorAll('[data-field]').forEach(el => el.addEventListener('input', refillCards));
renderFilters();
renderCards();
