/* =========================================================
   סימולטור פרישה — עובדי נמל חיפה  (PWA)
   Eligibility logic mirrors the Feb 2026 agreement.
   ========================================================= */
'use strict';

const WA = '972502423356';
const A = {
  MAX_RETIRE: 4_000_000, BONUS: 2_000_000, BUDGET: 90_000_000, QUOTA: 45,
  RET_AGE: 48, RET_VETEK: 10, RET_HORIZON: 3,
  BONUS_VETEK: 15, BONUS_HORIZON: 10,
};

const state = { gen: 'א', sector: 'תפעול', age: null, vetek: null, retAge: 67, salary: null };

const $ = id => document.getElementById(id);
const shekel = n => '₪' + Number(Math.round(n)).toLocaleString('he-IL');
const numv = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? null : n; };
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

const CHK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
const CRS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
const DOT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/></svg>';
const crit = (st, html) => `<div class="crit ${st}"><span class="cm">${st==='pass'?CHK:st==='fail'?CRS:DOT}</span><span>${html}</span></div>`;

/* ---------- navigation ---------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  const showBack = id !== 'screen-welcome';
  $('backBtn').classList.toggle('hidden', !showBack);
  $('tabbar').classList.toggle('show', id === 'screen-results');
  const sc = $(id).querySelector('.screen-scroll');
  if (sc) sc.scrollTop = 0;
  window.scrollTo(0, 0);
}
function goForm() { showScreen('screen-form'); }

$('backBtn').addEventListener('click', () => {
  const cur = document.querySelector('.screen.active').id;
  if (cur === 'screen-results') showScreen('screen-form');
  else if (cur === 'screen-form') showScreen('screen-welcome');
});

/* דור segmented control */
document.querySelectorAll('#segGen .seg-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#segGen .seg-opt').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    state.gen = btn.dataset.val;
  });
});

/* bottom tabs */
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
    t.classList.add('on');
    document.querySelectorAll('.res-tab').forEach(r => r.classList.remove('active'));
    $('tab-' + t.dataset.tab).classList.add('active');
    const sc = $('screen-results').querySelector('.screen-scroll');
    if (sc) sc.scrollTop = 0;
  });
});

/* ---------- eligibility ---------- */
function readForm() {
  state.sector = $('i-sector').value;
  state.age = numv($('i-age').value);
  state.vetek = numv($('i-vetek').value);
  state.retAge = numv($('i-retage').value) || 67;
  state.salary = numv($('i-salary').value);
  state.yearsLeft = state.age != null ? Math.max(0, state.retAge - state.age) : null;
}

function voluntary() {
  const baseGen = state.gen === 'א' || state.gen === 'ב-מייסד';
  const cV = state.vetek >= A.RET_VETEK, cA = state.age >= A.RET_AGE, cH = state.yearsLeft >= A.RET_HORIZON;
  let tier = null;
  if (state.gen === 'א' && state.age >= 50 && state.vetek >= 25) tier = 'דור א׳ · גיל 50 · ותק 25';
  else if (state.gen === 'א' && state.age >= 48 && state.vetek >= 20) tier = 'דור א׳ · גיל 48 · ותק 20';
  else if (state.gen === 'ב-מייסד' && state.age >= 48 && state.vetek >= 20) tier = 'דור ב׳ מייסד · גיל 48 · ותק 20';
  let status = 'no';
  if (!baseGen) status = 'no';
  else if (tier) status = 'ok';
  else if (cV && cA && cH) status = 'maybe';
  return { baseGen, cV, cA, cH, tier, status };
}

function bonus() {
  const genB = state.gen === 'ב-מייסד' || state.gen === 'ב-לא-מייסד';
  const cG = genB, cS = state.sector === 'תפעול', cV = state.vetek >= A.BONUS_VETEK, cH = state.yearsLeft >= A.BONUS_HORIZON;
  const core = cG && cS && cV;
  let status = 'no', amount = A.BONUS, proportional = false;
  if (core && cH) status = 'ok';
  else if (core && !cH) { status = 'maybe'; proportional = true; amount = A.BONUS * Math.max(0, state.yearsLeft) / A.BONUS_HORIZON; }
  return { cG, cS, cV, cH, core, status, amount, proportional };
}

/* ---------- calculate + render ---------- */
function calc() {
  readForm();
  if (state.age == null || state.vetek == null) {
    alert('כדי לבדוק זכאות יש להזין גיל וותק.');
    return;
  }
  const v = voluntary(), b = bonus();
  renderHero(v, b);
  renderTracks(v, b);
  renderCompare(v, b);
  renderSteps(v, b);
  renderWa(v, b);
  // prefill bridge-pension estimator from the main form
  if (state.salary) {
    if (!$('b-salary').value) $('b-salary').value = state.salary;
    if (!$('v-salary').value) $('v-salary').value = state.salary;
  }
  computeBridge();
  // reset to first tab
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
  document.querySelector('.tab[data-tab="tracks"]').classList.add('on');
  document.querySelectorAll('.res-tab').forEach(r => r.classList.remove('active'));
  $('tab-tracks').classList.add('active');
  showScreen('screen-results');
}

const stLabel = s => s === 'ok' ? 'זכאי/ת' : s === 'maybe' ? 'אולי / חריג' : 'לא כרגע';

function renderHero(v, b) {
  const best = (v.status === 'ok' || b.status === 'ok') ? 'ok' : (v.status === 'maybe' || b.status === 'maybe') ? 'maybe' : 'no';
  const headline = best === 'ok' ? 'נמצאה עבורך זכאות! 🎉' : best === 'maybe' ? 'ייתכן שמגיע לך — בכפוף לחריגים' : 'כרגע לא נמצאה זכאות מלאה';
  $('resultHero').innerHTML = `
    <div class="rh-label">תוצאת הסימולציה</div>
    <div class="rh-name">${headline}</div>
    <div class="rh-tracks">
      <div class="rh-track"><span class="t-status ${v.status}">${stLabel(v.status)}</span><div class="t-name">פרישה מרצון</div></div>
      <div class="rh-track"><span class="t-status ${b.status}">${stLabel(b.status)}</span><div class="t-name">מענק חד־פעמי</div></div>
    </div>`;
}

function renderTracks(v, b) {
  const genLabel = state.gen === 'א' ? 'דור א׳' : state.gen === 'ב-מייסד' ? 'דור ב׳ מייסד' : 'דור ב׳ לא מייסד';

  // voluntary card
  let vBody;
  if (!v.baseGen) {
    vBody = crit('fail', 'מסלול הפרישה מרצון חל על <b>דור א׳</b> ו<b>דור ב׳ מייסד</b> בלבד. לדור ב׳ לא מייסד — צפוי מו״מ על הסכם פרישה חדש מ‑<b>1.1.2028</b>.');
  } else {
    const head = v.tier ? `עומד/ת במדרגה: <b>${v.tier}</b>` :
      v.status === 'maybe' ? 'עומד/ת בתנאי הסף אך לא במדרגה מוגדרת — פרישה אפשרית באישור חריג.' :
      'לא מתקיימים כל תנאי הסף — ההנהלה רשאית לאשר חריגים.';
    vBody = `
      <div class="figure"><span class="fnum">${shekel(A.MAX_RETIRE)}</span><span class="flabel">תקרת עלות פרישה לעובד</span></div>
      ${crit(v.baseGen?'pass':'fail', `דור זכאי (${genLabel})`)}
      ${crit(v.cV?'pass':'fail', `ותק ≥ 10 <b>(${state.vetek})</b>`)}
      ${crit(v.cA?'pass':'fail', `גיל ≥ 48 <b>(${state.age})</b>`)}
      ${crit(v.cH?'pass':'fail', `≥ 3 שנים לפרישת חובה <b>(${state.yearsLeft})</b>`)}
      <div class="note">${head}<br><br>כולל <b>פנסיית גישור</b>, <b>מענק פרישה</b> והמשך כיסוי פנסיוני עד גיל פרישת חובה. לזכאים תונפק סימולציה אישית, ואחריה 21 יום להחליט.</div>`;
  }

  // bonus card
  let bFigure, bNote;
  if (b.status === 'ok') {
    bFigure = `<div class="figure green"><span class="fnum">${shekel(A.BONUS)}</span><span class="flabel">מענק ברוטו לעובד</span></div>`;
    bNote = 'עומד/ת בכל תנאי הסף למענק החד־פעמי.';
  } else if (b.status === 'maybe') {
    bFigure = `<div class="figure"><span class="fnum">${shekel(b.amount)}</span><span class="flabel">הערכת מענק יחסי — להמחשה בלבד</span></div>`;
    bNote = 'נותרו פחות מ‑10 שנים לפרישת חובה — ניתן להגיש <b>בקשה חריגה</b>; ההנהלה תשקול מענק יחסי (החישוב הוא הערכה גסה בלבד).';
  } else {
    bFigure = `<div class="figure"><span class="fnum">${shekel(A.BONUS)}</span><span class="flabel">מענק ברוטו (לזכאים)</span></div>`;
    bNote = 'לא מתקיימים כל תנאי הסף למענק החד־פעמי.';
  }
  const bBody = `${bFigure}
    ${crit(b.cG?'pass':'fail', 'דור ב׳ (מייסד או לא מייסד)')}
    ${crit(b.cS?'pass':'fail', 'מגזר תפעול')}
    ${crit(b.cV?'pass':'fail', `ותק ≥ 15 <b>(${state.vetek})</b>`)}
    ${crit(b.cH?'pass':(b.core?'info':'fail'), `≥ 10 שנים לפרישת חובה <b>(${state.yearsLeft})</b>${!b.cH&&b.core?' — ניתן כחריג':''}`)}
    <div class="note">${bNote}<br><br><b>מסגרת:</b> תקציב ₪90M (2027) · מכסה עד 45 עובדי דור ב׳ מתפעול · פרישה עד 30.4.2027 (הארכה עד סוף 2028).</div>`;

  $('tracksWrap').innerHTML = `
    <div class="track">
      <div class="track-top">
        <div class="track-ico" style="background:#6d28d91a;color:#6d28d9"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg></div>
        <h3>פרישה מרצון<span>הסכם 11.02.2026</span></h3>
        <span class="badge ${v.status}">${stLabel(v.status)}</span>
      </div>
      <div class="track-body">${vBody}</div>
    </div>
    <div class="track">
      <div class="track-top">
        <div class="track-ico" style="background:#0d9e451a;color:#0d9e45"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg></div>
        <h3>מענק פרישה חד־פעמי<span>תכנית מענקים 2027</span></h3>
        <span class="badge ${b.status}">${stLabel(b.status)}</span>
      </div>
      <div class="track-body">${bBody}</div>
    </div>`;
}

function renderCompare(v, b) {
  const rows = [
    ['זכאות (עבורך)', `<span class="badge ${v.status}">${stLabel(v.status)}</span>`, `<span class="badge ${b.status}">${stLabel(b.status)}</span>`],
    ['סכום', 'תקרה ₪4M', '₪2M ברוטו'],
    ['דורות', 'א׳ · ב׳ מייסד', 'ב׳ מייסד + לא מייסד'],
    ['מגזר', 'כל המגזרים', 'תפעול בלבד'],
    ['ותק נדרש', '10 שנים', '15 שנים'],
    ['מה מקבלים', 'פנסיית גישור + מענק + כיסוי', 'מענק חד־פעמי'],
    ['מועד פרישה', 'תוך שנה / עד סוף 2027', 'עד 30.4.2027'],
  ];
  $('cmpTable').innerHTML =
    '<thead><tr><th>נתון</th><th>פרישה מרצון</th><th>מענק חד־פעמי</th></tr></thead><tbody>' +
    rows.map(r => `<tr><td class="m">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') +
    '</tbody>';
}

function renderSteps(v, b) {
  const eligible = v.status !== 'no' || b.status !== 'no';
  const steps = eligible ? [
    ['אספו מסמכים', 'תעודת זהות, תלוש שכר אחרון ואישור ותק/דוח פנסיוני עדכני.'],
    ['בקשת סימולציה אישית', 'ההנהלה תנפיק לזכאים סימולציה אישית עם הנתונים המדויקים.'],
    ['החלטה תוך 21 יום', 'לאחר קבלת הסימולציה — יש 21 יום להודיע על הרצון לפרוש (פרישה מרצון).'],
    ['ליווי אישי', 'קרן תבדוק כדאיות, תסביר את המשמעות המיסויית והפנסיונית ותלווה בהגשה.'],
  ] : [
    ['בדקו שוב בעתיד', 'תנאי הזכאות תלויים בגיל ובוותק — ייתכן שתהיו זכאים בהמשך.'],
    ['בירור חריגים', 'ההנהלה רשאית לאשר חריגים במקרים מיוחדים — שווה לברר.'],
    ['ליווי אישי', 'קרן תוכל לבחון את מצבכם הספציפי ולכוון להמשך.'],
  ];
  $('stepsWrap').innerHTML = steps.map((s, i) =>
    `<div class="step"><span class="step-n">${i+1}</span><span class="step-txt"><strong>${s[0]}</strong><span>${s[1]}</span></span></div>`).join('');
}

function renderWa(v, b) {
  const lines = [
    'שלום קרן, בדקתי את סימולטור הפרישה של נמל חיפה:',
    `דור: ${state.gen === 'א' ? 'א׳' : state.gen === 'ב-מייסד' ? 'ב׳ מייסד' : 'ב׳ לא מייסד'} | גיל: ${state.age} | ותק: ${state.vetek}`,
    `פרישה מרצון: ${stLabel(v.status)} | מענק חד־פעמי: ${stLabel(b.status)}`,
    'אשמח לבדוק כדאיות וללוות בתהליך.',
  ];
  $('waBtn').href = `https://wa.me/${WA}?text=${encodeURIComponent(lines.join('\n'))}`;
}

/* ---------- bridge pension estimate (פנסיית גישור) ----------
   Per הסכם 3. Parameters calibrated against the agreement's worked example
   (balance 100k, salary 1k, 57→67, return 3.74%, 0.9×20.5% contributions,
   factor 200 → ₪855). Two fund types: new accumulating & veteran. */
let fundType = 'new';

function bridgeYears() {
  return (state.retAge && state.age != null) ? Math.max(0, state.retAge - state.age) : 0;
}

function computeBridge() {
  const years = bridgeYears(), n = Math.round(years * 12);
  $('b-period').textContent = years > 0
    ? `תקופת גישור מוערכת: ${years} שנים (${n} חודשים) — מגיל ${state.age} עד גיל פרישת חובה ${state.retAge}.`
    : 'הזינו גיל בטופס הראשי כדי לחשב את תקופת הגישור.';
  if (fundType === 'vet') computeVet();
  else computeNew(years, n);
}

/* new accumulating fund: [ balance advanced + contributions advanced ] / factor */
function computeNew(years, n) {
  const salary = numv($('b-salary').value), balance = numv($('b-balance').value);
  const factor = numv($('b-factor').value) || 200;
  const r = (numv($('b-return').value) || 0) / 100;
  const rate = (numv($('b-rate').value) || 0) / 100;
  if (!balance || !factor || n <= 0) { $('bridgeResult').innerHTML = emptyNote(); return; }
  const rm = Math.pow(1 + r, 1/12) - 1;
  const fvBalance = balance * Math.pow(1 + r, years);
  const monthly = 0.9 * rate * (salary || 0); // 0.9 coefficient per the agreement
  const fvContrib = rm > 0 ? monthly * ((Math.pow(1 + rm, n) - 1) / rm) : monthly * n;
  const bridge = (fvBalance + fvContrib) / factor;
  $('bridgeResult').innerHTML = bridgeCard(bridge, [
    ['יתרה צבורה מקודמת', shekel(fvBalance)],
    ['תגמולים עתידיים מקודמים', shekel(fvContrib)],
    [`סה״כ ÷ מקדם ${factor}`, `(${shekel(fvBalance)} + ${shekel(fvContrib)}) ÷ ${factor}`],
  ], `למבוטח ב<b>פנסיה צוברת חדשה</b>. משולם מדי חודש לאורך כ‑${n} חודשי הגישור ומתעדכן לפי המדד. <b>אומדן בלבד.</b>`);
}

/* veteran fund: accrual% (2%/yr, cap 70%) × pensionable salary × (1 + 10% increase) */
function computeVet() {
  const salary = numv($('v-salary').value), vyears = numv($('v-years').value);
  const perYear = (numv($('v-accrual').value) || 2) / 100;
  const inc = (numv($('v-increase').value) || 0) / 100;
  if (!salary || !vyears) { $('bridgeResult').innerHTML = emptyNote('הזינו <b>משכורת קובעת</b> ו<b>שנות חברות</b> בקרן.'); return; }
  const accrual = Math.min(0.70, perYear * vyears);
  const base = accrual * salary;
  const bridge = base * (1 + inc);
  $('bridgeResult').innerHTML = bridgeCard(bridge, [
    ['שיעור צבירה', (accrual * 100).toFixed(0) + '%' + (accrual >= 0.70 ? ' (תקרה)' : '')],
    ['פנסיה בסיסית', shekel(base)],
    [`בתוספת הגדלה ${(inc * 100).toFixed(0)}%`, `${shekel(base)} × ${(1 + inc).toFixed(2)}`],
  ], `למבוטח ב<b>קרן ותיקה</b>. בנוסף, החברה מפקידה 13.5% מהמשכורת הקובעת ומנוכה 7% מהעובד. <b>אומדן בלבד</b> — הפנסיה המחייבת נמסרת ע״י הקרן.`);
}

function emptyNote(msg) {
  return `<div class="note" style="margin:0">${msg || 'הזינו <b>צבירה</b> ו<b>מקדם המרה</b> (וגיל בטופס) לקבלת אומדן.'}</div>`;
}
function bridgeCard(amount, rows, note) {
  return `<div class="track" style="margin-top:1rem"><div class="track-body" style="padding-top:1.1rem">
    <div class="figure green"><span class="fnum">${shekel(amount)}</span><span class="flabel">אומדן פנסיית גישור חודשית</span></div>
    ${rows.map(r => `<div class="crit info"><span class="cm">${DOT}</span><span>${r[0]}: <b>${r[1]}</b></span></div>`).join('')}
    <div class="note">${note}</div></div></div>`;
}

/* fund-type toggle */
document.querySelectorAll('#fundToggle .ft-opt').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#fundToggle .ft-opt').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    fundType = btn.dataset.fund;
    $('bridge-new').classList.toggle('hidden', fundType !== 'new');
    $('bridge-vet').classList.toggle('hidden', fundType !== 'vet');
    computeBridge();
  });
});

['b-salary','b-balance','b-factor','b-return','b-rate','v-salary','v-years','v-accrual','v-increase'].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener('input', computeBridge);
});

/* ---------- PWA service worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
