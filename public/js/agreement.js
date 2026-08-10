/* =========================================================
   מחשבון הסכם נמל חיפה — פברואר 2026
   Eligibility + entitlement simulator built strictly from the
   figures in the signed agreement. Estimates only; the binding
   personal simulation is issued by management.
   ========================================================= */
'use strict';

/* ---- agreement constants (from the Feb 2026 document) ---- */
const A = {
  ONE_TIME_BONUS: 2_000_000,   // מענק חד"פ ברוטו לעובד
  MAX_RETIRE_COST: 4_000_000,  // תקרת עלות פרישה מרצון
  BONUS_BUDGET: 90_000_000,    // תקציב מענקים (2027)
  BONUS_QUOTA: 45,             // מכסת פורשים דור ב' מתפעול
  WAGE_BASE_ADD: 500,          // תוספת חודשית לבסיס
  WAGE_HOUR_ADD: 2.7,          // ≈ תוספת לשעה
  RETRO_YEAR: 2025, RETRO_MONTH: 1, // רטרו מ-1.1.2025
  PREMIUM_MIN: 12, PREMIUM_MAX: 25, // שעות פרמיה למשמרת
  BONUS_VETEK: 15, BONUS_HORIZON: 10, // תנאי מענק חד"פ
  RET_MIN_AGE: 48, RET_MIN_VETEK: 10, RET_MIN_HORIZON: 3, // סף פרישה מרצון
  JOB_SECURITY_B: '1.1.2037',
};

/* ---- helpers ---- */
const num = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? null : n; };
const shekel = n => '₪' + Number(Math.round(n)).toLocaleString('he-IL');
function val(id) { return document.getElementById(id).value; }

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const DOT   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>';

function crit(state, html) {
  const mark = state === 'pass' ? CHECK : state === 'fail' ? CROSS : DOT;
  return `<div class="crit ${state}"><span class="crit-mark">${mark}</span><span class="crit-txt">${html}</span></div>`;
}

/* ---- read employee inputs ---- */
function readInputs() {
  const gen = val('i-gen');
  const sector = val('i-sector');
  const age = num(val('i-age'));
  const vetek = num(val('i-vetek'));
  const retAge = num(val('i-retage')) || 67;
  let yearsLeft = num(val('i-yearsleft'));
  if (yearsLeft === null && age !== null) yearsLeft = Math.max(0, retAge - age);
  return {
    gen, sector, age, vetek, retAge, yearsLeft,
    salary: num(val('i-salary')),
    premRate: num(val('i-premrate')),
    shifts: num(val('i-shifts')),
    retroTo: val('i-retro-to'),
  };
}

/* ========================================================
   result card builders
   ======================================================== */
function card({ color, icon, title, sub, badge, badgeClass, body }) {
  return `<div class="res-card">
    <div class="res-head">
      <div class="res-icon" style="background:${color}1a;color:${color}">${icon}</div>
      <div style="flex:1"><h3>${title}</h3>${sub ? `<div class="res-sub">${sub}</div>` : ''}</div>
      ${badge ? `<span class="res-badge ${badgeClass}">${badge}</span>` : ''}
    </div>
    <div class="res-body">${body}</div>
  </div>`;
}

/* 1 — פרישה מרצון */
function cardVoluntary(d) {
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>';
  const isBaseGen = d.gen === 'א' || d.gen === 'ב-מייסד';
  const genLabel = d.gen === 'א' ? 'דור א׳' : d.gen === 'ב-מייסד' ? 'דור ב׳ מייסד' : 'דור ב׳ לא מייסד';

  if (!isBaseGen) {
    return card({ color: '#6d28d9', icon, title: 'פרישה מרצון', sub: 'הסכם 11.02.2026',
      badge: 'לא רלוונטי', badgeClass: 'no',
      body: crit('fail', `מסלול הפרישה מרצון חל על <b>דור א׳</b> ו<b>דור ב׳ מייסד</b> בלבד. עבור דור ב׳ לא מייסד — צפוי מו״מ על הסכם פרישה חדש החל מ‑<b>1.1.2028</b>.`) });
  }
  if (d.age === null || d.vetek === null) {
    return card({ color: '#6d28d9', icon, title: 'פרישה מרצון', sub: 'הסכם 11.02.2026',
      body: `<div class="res-note">הזיני <b>גיל</b> ו<b>ותק</b> כדי לבדוק זכאות.</div>` });
  }

  const cVetek   = d.vetek >= A.RET_MIN_VETEK;
  const cAge     = d.age >= A.RET_MIN_AGE;
  const cHorizon = d.yearsLeft >= A.RET_MIN_HORIZON;

  // matching a defined tier
  let tier = null;
  if (d.gen === 'א' && d.age >= 50 && d.vetek >= 25) tier = 'דור א׳ · גיל 50 · ותק 25';
  else if (d.gen === 'א' && d.age >= 48 && d.vetek >= 20) tier = 'דור א׳ · גיל 48 · ותק 20';
  else if (d.gen === 'ב-מייסד' && d.age >= 48 && d.vetek >= 20) tier = 'דור ב׳ מייסד · גיל 48 · ותק 20';

  const baseOk = cVetek && cAge && cHorizon;
  let badge, badgeClass, headline;
  if (tier)        { badge = 'זכאי/ת'; badgeClass = 'ok';    headline = `עומד/ת במדרגת פרישה: <b>${tier}</b>`; }
  else if (baseOk) { badge = 'בכפוף לחריגים'; badgeClass = 'maybe'; headline = 'עומד/ת בתנאי הסף אך לא במדרגת פרישה מוגדרת — פרישה אפשרית באישור חריג של ההנהלה.'; }
  else             { badge = 'לא עומד/ת בסף'; badgeClass = 'no'; headline = 'לא מתקיימים כל תנאי הסף — ההנהלה רשאית לאשר חריגים במקרים מיוחדים.'; }

  const crits = [
    crit(isBaseGen ? 'pass' : 'fail', `דור זכאי (${genLabel})`),
    crit(cVetek ? 'pass' : 'fail', `ותק ≥ 10 שנים <b>(${d.vetek})</b>`),
    crit(cAge ? 'pass' : 'fail', `גיל ≥ 48 <b>(${d.age})</b>`),
    crit(cHorizon ? 'pass' : 'fail', `נותרו ≥ 3 שנים לפרישת חובה <b>(${d.yearsLeft})</b>`),
  ].join('');

  return card({ color: '#6d28d9', icon, title: 'פרישה מרצון', sub: 'הסכם 11.02.2026', badge, badgeClass,
    body: `
      <div class="res-figure"><span class="rf-num">${shekel(A.MAX_RETIRE_COST)}</span><span class="rf-label">תקרת עלות פרישה מקסימלית לעובד</span></div>
      <div class="res-crit">${crits}</div>
      <div class="res-note">${headline}<br><br>
        החבילה כוללת: <b>פנסיית גישור חודשית</b>, <b>מענק פרישה</b> והמשך כיסוי פנסיוני עד גיל פרישת חובה.
        עלות פרישה עד ₪4M → פרישה בתוך שנה; מעל ₪4M → עד סוף 2027 (עפ״י צורכי החברה). לזכאים תונפק <b>סימולציה אישית</b> ולאחריה 21 יום להודיע על פרישה.</div>` });
}

/* 2 — מענק פרישה חד"פ */
function cardBonus(d) {
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>';
  const isGenB = d.gen === 'ב-מייסד' || d.gen === 'ב-לא-מייסד';

  if (d.age === null || d.vetek === null) {
    return card({ color: '#0d9e45', icon, title: 'מענק פרישה חד־פעמי', sub: 'תכנית מענקים 2027',
      body: `<div class="res-note">הזיני <b>גיל</b> ו<b>ותק</b> כדי לבדוק זכאות.</div>` });
  }

  const cGen = isGenB;
  const cSector = d.sector === 'תפעול';
  const cVetek = d.vetek >= A.BONUS_VETEK;
  const cHorizon = d.yearsLeft >= A.BONUS_HORIZON;
  const coreOk = cGen && cSector && cVetek;

  let badge, badgeClass, figure, note;
  if (coreOk && cHorizon) {
    badge = 'זכאי/ת'; badgeClass = 'ok';
    figure = `<div class="res-figure green"><span class="rf-num">${shekel(A.ONE_TIME_BONUS)}</span><span class="rf-label">מענק ברוטו לעובד</span></div>`;
    note = 'עומד/ת בכל תנאי הסף למענק החד־פעמי.';
  } else if (coreOk && !cHorizon) {
    badge = 'חריג — יחסי'; badgeClass = 'maybe';
    const est = A.ONE_TIME_BONUS * Math.max(0, d.yearsLeft) / A.BONUS_HORIZON;
    figure = `<div class="res-figure"><span class="rf-num">${shekel(est)}</span><span class="rf-label">הערכת מענק יחסי — להמחשה בלבד</span></div>`;
    note = `נותרו פחות מ‑10 שנים לפרישת חובה — ניתן להגיש <b>בקשה חריגה</b>. ההנהלה תשקול מענק יחסי לפי הזמן שנותר (החישוב כאן הוא הערכה גסה בלבד ואינו מחייב).`;
  } else {
    badge = 'לא עומד/ת בסף'; badgeClass = 'no';
    figure = `<div class="res-figure"><span class="rf-num">${shekel(A.ONE_TIME_BONUS)}</span><span class="rf-label">מענק ברוטו (לזכאים)</span></div>`;
    note = 'לא מתקיימים כל תנאי הסף למענק החד־פעמי.';
  }

  const crits = [
    crit(cGen ? 'pass' : 'fail', `דור ב׳ (מייסד או לא מייסד)`),
    crit(cSector ? 'pass' : 'fail', `מגזר תפעול`),
    crit(cVetek ? 'pass' : 'fail', `ותק ≥ 15 שנים <b>(${d.vetek})</b>`),
    crit(cHorizon ? 'pass' : (coreOk ? 'info' : 'fail'), `נותרו ≥ 10 שנים לפרישת חובה <b>(${d.yearsLeft})</b>${!cHorizon && coreOk ? ' — ניתן להגיש כחריג' : ''}`),
  ].join('');

  return card({ color: '#0d9e45', icon, title: 'מענק פרישה חד־פעמי', sub: 'תכנית מענקים 2027', badge, badgeClass,
    body: `${figure}
      <div class="res-crit">${crits}</div>
      <div class="res-note">${note}<br><br>
        <b>מסגרת התכנית:</b> תקציב ₪90M (2027) · מכסה עד 45 עובדי דור ב׳ מתפעול · גיבוש רשימה עד נוב׳ 2026 · פרישה במהלך 2027 ולא יאוחר מ‑30.4.2027 (עם מנגנון הארכה עד סוף 2028).</div>` });
}

/* 3 — תוספת שכר */
function cardWage(d) {
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>';
  // retro months, inclusive from Jan 2025
  let months = 0, toLabel = '';
  const to = d.retroTo ? new Date(d.retroTo + 'T00:00:00') : new Date();
  if (!isNaN(to)) {
    months = Math.max(0, (to.getFullYear() - A.RETRO_YEAR) * 12 + (to.getMonth() + 1 - A.RETRO_MONTH) + 1);
    toLabel = to.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  }
  const retroSum = months * A.WAGE_BASE_ADD;

  return card({ color: '#1e40af', icon, title: 'תוספת שכר', sub: 'רטרו מ‑1.1.2025', badge: 'לכלל העובדים', badgeClass: 'ok',
    body: `
      <div class="res-figure"><span class="rf-num">${shekel(retroSum)}</span><span class="rf-label">רטרו מצטבר עד ${toLabel} (${months} חודשים × ₪500)</span></div>
      <div class="res-kv-row">
        <div class="res-kv"><span>תוספת חודשית לבסיס</span><strong>₪500</strong></div>
        <div class="res-kv"><span>תוספת לשעה (≈)</span><strong>₪2.7</strong></div>
      </div>
      <div class="res-note">התוספת מתווספת ל<b>בסיס</b> השכר. ב‑<b>1.8.2026</b> נפתח מו״מ על הסכם שכר חדש.
      ${d.salary ? `<br>שכר בסיס לאחר התוספת: <b>${shekel(d.salary + A.WAGE_BASE_ADD)}</b>.` : ''}</div>` });
}

/* 4 — הגנת פרמיה */
function cardPremium(d) {
  const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>';
  let figure;
  if (d.premRate && d.shifts) {
    const min = A.PREMIUM_MIN * d.shifts * d.premRate;
    const max = A.PREMIUM_MAX * d.shifts * d.premRate;
    figure = `<div class="res-kv-row">
      <div class="res-kv"><span>מינ׳ פרמיה חודשית מוגנת</span><strong>${shekel(min)}</strong></div>
      <div class="res-kv"><span>מקס׳ פרמיה חודשית</span><strong>${shekel(max)}</strong></div>
    </div>
    <div class="res-note" style="margin-top:0">לפי ${d.shifts} משמרות × ₪${d.premRate} לשעת פרמיה, בטווח 12–25 שעות למשמרת.</div>`;
  } else {
    figure = `<div class="res-kv-row">
      <div class="res-kv"><span>מינימום למשמרת</span><strong>12 שעות</strong></div>
      <div class="res-kv"><span>מקסימום למשמרת</span><strong>25 שעות</strong></div>
    </div>
    <div class="res-note" style="margin-top:0">הזיני <b>ערך שעת פרמיה</b> ו<b>משמרות בחודש</b> לחישוב ערך חודשי.</div>`;
  }
  return card({ color: '#b45309', icon, title: 'הגנת פרמיה', sub: 'דור א׳ ודור ב׳', badge: 'מנגנון הגנה', badgeClass: 'ok',
    body: `${figure}
      <div class="res-note">מינימום <b>12 שעות</b> פרמיה למשמרת מלאה/חלקית (א׳/ב׳/ג׳), תקרה <b>25 שעות</b>.
      חריגים לפי תחנה: סידור עבודה — 10 שעות קבוע; עבודה מיוחדת עד חצי משמרת — 8 שעות; מטענים מיוחדים — עד <b>30 שעות</b>.
      בשביתה/עיצומים ההגנה נשמרת אלא אם חלה ירידה של 50%+ בתפוקה (בהוכחת החברה).</div>` });
}

/* ========================================================
   render
   ======================================================== */
function render() {
  const d = readInputs();
  document.getElementById('results').innerHTML =
    cardVoluntary(d) + cardBonus(d) + cardWage(d) + cardPremium(d);
}

/* ========================================================
   agreement comparison table
   ======================================================== */
const METRICS = [
  { key: 'wage_base',   label: 'תוספת חודשית לבסיס',        cur: '₪500' },
  { key: 'wage_hour',   label: 'תוספת לשעה',                cur: '≈ ₪2.7' },
  { key: 'retro_from',  label: 'רטרו מתאריך',               cur: '1.1.2025' },
  { key: 'bonus',       label: 'מענק פרישה חד־פעמי (ברוטו)', cur: '₪2,000,000' },
  { key: 'retire_cap',  label: 'תקרת עלות פרישה מרצון',      cur: '₪4,000,000' },
  { key: 'budget',      label: 'תקציב מענקים',              cur: '₪90,000,000' },
  { key: 'quota',       label: 'מכסת פורשים (מענק)',         cur: '45 עובדים' },
  { key: 'prem_min',    label: 'מינ׳ פרמיה למשמרת',          cur: '12 שעות' },
  { key: 'prem_max',    label: 'מקס׳ פרמיה למשמרת',          cur: '25 שעות' },
  { key: 'job_sec',     label: 'ביטחון תעסוקתי דור ב׳ לא מייסד עד', cur: '1.1.2037' },
];

let prevAgreements = []; // [{ name, values: {key: val} }]
let prevSeq = 0;

function renderCmp() {
  const t = document.getElementById('cmpTable');
  let html = '<thead><tr><th class="cmp-metric">נתון</th><th class="cmp-cur">הסכם פברואר 2026</th>';
  prevAgreements.forEach(a => {
    html += `<th><div class="agr-cmp-colhead">
      <input value="${esc(a.name)}" placeholder="הסכם קודם" oninput="setPrevName(${a._id}, this.value)" />
      <button class="agr-cmp-remove" title="הסרה" onclick="removeAgreementCol(${a._id})">✕</button>
    </div></th>`;
  });
  html += '</tr></thead><tbody>';
  METRICS.forEach(m => {
    html += `<tr><td class="cmp-metric">${m.label}</td><td class="cmp-cur">${m.cur}</td>`;
    prevAgreements.forEach(a => {
      html += `<td><input value="${esc(a.values[m.key] || '')}" placeholder="—" oninput="setPrevVal(${a._id}, '${m.key}', this.value)" /></td>`;
    });
    html += '</tr>';
  });
  html += '</tbody>';
  t.innerHTML = html;
}

function addAgreementCol() {
  prevAgreements.push({ _id: ++prevSeq, name: '', values: {} });
  renderCmp();
}
function removeAgreementCol(id) { prevAgreements = prevAgreements.filter(a => a._id !== id); renderCmp(); }
function setPrevName(id, v) { const a = prevAgreements.find(x => x._id === id); if (a) a.name = v; }
function setPrevVal(id, key, v) { const a = prevAgreements.find(x => x._id === id); if (a) a.values[key] = v; }

/* ========================================================
   demo + init
   ======================================================== */
function loadDemo() {
  document.getElementById('i-gen').value = 'ב-מייסד';
  document.getElementById('i-sector').value = 'תפעול';
  document.getElementById('i-age').value = 52;
  document.getElementById('i-vetek').value = 24;
  document.getElementById('i-retage').value = 67;
  document.getElementById('i-yearsleft').value = '';
  document.getElementById('i-salary').value = 14000;
  document.getElementById('i-premrate').value = 70;
  document.getElementById('i-shifts').value = 18;
  render();
  toast('נטענו נתוני דוגמה ✓');
}

document.getElementById('i-retro-to').value = new Date().toISOString().slice(0, 10);
document.querySelectorAll('[data-in]').forEach(el => el.addEventListener('input', render));
render();
renderCmp();
