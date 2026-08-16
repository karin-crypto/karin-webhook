/* =========================================================
   מחולל דוחות – לוגיקה
   Live-binds client + policy inputs to a printable report.
   ========================================================= */
'use strict';

const WA_NUMBER = '972502423356';

/* policy type → dot color (mirrors the portal palette) */
function policyColor(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('פנסיה'))   return '#1e40af';
  if (t.includes('מנהלים'))  return '#16a34a';
  if (t.includes('בריאות'))  return '#ea580c';
  if (t.includes('השתלמות')) return '#b45309';
  if (t.includes('גמל'))     return '#0891b2';
  if (t.includes('חיים') || t.includes('ריסק')) return '#dc2626';
  return '#6d28d9';
}

const POLICY_TYPES = ['קרן פנסיה', 'ביטוח מנהלים', 'קופת גמל', 'קרן השתלמות', 'ביטוח חיים', 'ביטוח בריאות', 'גמל להשקעה', 'אחר'];

/* ---------- state ---------- */
let policies = [];
let seq = 0;

function blankPolicy() {
  return { _id: ++seq, type: 'קרן פנסיה', company: '', number: '', track: '',
           deposit: '', accumulation: '', yield: '', fee_deposit: '', fee_balance: '' };
}

/* ---------- number helpers ---------- */
const fmtNum = n => Number(n || 0).toLocaleString('he-IL');
const toNum  = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };

/* ========================================================
   EDITOR: policy rows
   ======================================================== */
function renderPolicyEditor() {
  const wrap = document.getElementById('policyEditor');
  if (!policies.length) {
    wrap.innerHTML = '<div class="rep-empty">אין פוליסות עדיין — הוסיפי את הראשונה למטה.</div>';
    return;
  }
  wrap.innerHTML = policies.map((p, i) => `
    <div class="pe-row" data-id="${p._id}">
      <div class="pe-row-head">
        <strong>פוליסה ${i + 1}</strong>
        <button class="btn-danger-ghost" title="מחיקה" onclick="removePolicy(${p._id})">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </button>
      </div>
      <div class="grid-2">
        <div class="field"><label>סוג</label>
          <select data-p="type">${POLICY_TYPES.map(t => `<option ${t === p.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
        </div>
        <div class="field"><label>חברה מנהלת</label><input data-p="company" value="${esc(p.company)}" placeholder="מגדל / הראל / כלל..." /></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>מספר פוליסה</label><input data-p="number" value="${esc(p.number)}" placeholder="—" /></div>
        <div class="field"><label>מסלול השקעה</label><input data-p="track" value="${esc(p.track)}" placeholder="כללי / מניות / אג״ח" /></div>
      </div>
      <div class="grid-3">
        <div class="field"><label>הפקדה חודשית (₪)</label><input data-p="deposit" value="${esc(p.deposit)}" inputmode="numeric" placeholder="0" /></div>
        <div class="field"><label>צבירה (₪)</label><input data-p="accumulation" value="${esc(p.accumulation)}" inputmode="numeric" placeholder="0" /></div>
        <div class="field"><label>תשואה שנתית (%)</label><input data-p="yield" value="${esc(p.yield)}" inputmode="decimal" placeholder="0" /></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>דמי ניהול מהפקדה (%)</label><input data-p="fee_deposit" value="${esc(p.fee_deposit)}" inputmode="decimal" placeholder="0" /></div>
        <div class="field"><label>דמי ניהול מצבירה (%)</label><input data-p="fee_balance" value="${esc(p.fee_balance)}" inputmode="decimal" placeholder="0" /></div>
      </div>
    </div>`).join('');

  // wire inputs
  wrap.querySelectorAll('.pe-row').forEach(row => {
    const id = Number(row.dataset.id);
    const p = policies.find(x => x._id === id);
    row.querySelectorAll('[data-p]').forEach(el => {
      el.addEventListener('input', () => { p[el.dataset.p] = el.value; renderReport(); });
    });
  });
}

function addPolicy() { policies.push(blankPolicy()); renderPolicyEditor(); renderReport(); }
function removePolicy(id) { policies = policies.filter(p => p._id !== id); renderPolicyEditor(); renderReport(); }

/* ========================================================
   PREVIEW: the printable report
   ======================================================== */
function val(id) { return document.getElementById(id).value.trim(); }

function renderReport() {
  const name    = val('f-name')  || 'שם הלקוח';
  const id      = val('f-id');
  const phone   = val('f-phone');
  const title   = val('f-title') || 'דוח מצב פיננסי — סקירה תקופתית';
  const summary = val('f-summary');
  const dateRaw = val('f-date');
  const date = dateRaw
    ? new Date(dateRaw + 'T00:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('he-IL', { day: '2-digit', month: 'long', year: 'numeric' });

  // totals
  const totalAcc = policies.reduce((s, p) => s + toNum(p.accumulation), 0);
  const totalDep = policies.reduce((s, p) => s + toNum(p.deposit), 0);
  // accumulation-weighted average yield (falls back to simple mean)
  const withYield = policies.filter(p => p.yield !== '' && p.yield != null);
  let avgYield = 0;
  const wBase = withYield.reduce((s, p) => s + toNum(p.accumulation), 0);
  if (wBase > 0) avgYield = withYield.reduce((s, p) => s + toNum(p.yield) * toNum(p.accumulation), 0) / wBase;
  else if (withYield.length) avgYield = withYield.reduce((s, p) => s + toNum(p.yield), 0) / withYield.length;

  const clientLine = [
    id ? `<span>ת״ז <b>${esc(id)}</b></span>` : '',
    phone ? `<span>טל׳ <b>${esc(phone)}</b></span>` : '',
  ].filter(Boolean).join('');

  const policiesHtml = policies.length ? policies.map(p => {
    const cells = [
      p.track       ? kv('מסלול', esc(p.track)) : '',
      p.deposit     ? kv('הפקדה חודשית', '₪' + fmtNum(toNum(p.deposit))) : '',
      p.accumulation? kv('צבירה', '₪' + fmtNum(toNum(p.accumulation))) : '',
      p.yield !== ''? kv('תשואה שנתית', (toNum(p.yield) >= 0 ? '+' : '') + p.yield + '%', toNum(p.yield) >= 0) : '',
      p.fee_deposit ? kv('ד״נ מהפקדה', p.fee_deposit + '%') : '',
      p.fee_balance ? kv('ד״נ מצבירה', p.fee_balance + '%') : '',
    ].filter(Boolean).join('');
    return `
      <div class="rep-policy">
        <div class="rep-policy-head">
          <span class="rep-policy-dot" style="background:${policyColor(p.type)}"></span>
          <h4>${esc(p.type)}${p.company ? ' — ' + esc(p.company) : ''}</h4>
          ${p.number ? `<span class="rep-badge" style="background:var(--off2);color:var(--gray)">#${esc(p.number)}</span>` : ''}
          <span class="rep-badge">פעיל</span>
        </div>
        ${cells ? `<div class="rep-policy-grid">${cells}</div>` : ''}
      </div>`;
  }).join('') : '<div class="rep-empty">לא נוספו פוליסות לדוח.</div>';

  document.getElementById('report').innerHTML = `
    <div class="rep-head">
      <div class="rep-head-top">
        <div class="rep-logo">
          <div class="rep-logo-mark">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 6L38 14V24C38 32 31 39.5 24 42C17 39.5 10 32 10 24V14L24 6Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 24L22 28L30 20" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div><strong>קרן קרן</strong><span>סוכנות לביטוח ופיננסים</span></div>
        </div>
        <div class="rep-meta">תאריך הפקה<br><b style="color:#fff">${date}</b></div>
      </div>
      <div class="rep-title">
        <h1>${esc(title)}</h1>
        <div class="rep-client"><span>עבור <b>${esc(name)}</b></span>${clientLine}</div>
      </div>
    </div>

    <div class="rep-body">
      <div class="rep-stats">
        <div class="rep-stat"><span>סה״כ צבירה</span><strong>₪${fmtNum(Math.round(totalAcc))}</strong></div>
        <div class="rep-stat"><span>הפקדה חודשית כוללת</span><strong>₪${fmtNum(Math.round(totalDep))}</strong></div>
        <div class="rep-stat"><span>תשואה ממוצעת משוקללת</span><strong class="${avgYield >= 0 ? 'pos' : ''}">${(avgYield >= 0 ? '+' : '') + avgYield.toFixed(2)}%</strong></div>
      </div>

      <div class="rep-section-title">פירוט פוליסות ומוצרים (${policies.length})</div>
      ${policiesHtml}

      ${summary ? `
      <div class="rep-summary">
        <h5>✦ סיכום והמלצות</h5>
        <p>${esc(summary)}</p>
      </div>` : ''}
    </div>

    <div class="rep-foot">
      <div class="rep-agent">
        <div class="rep-logo-mark" style="width:32px;height:32px;border-radius:8px">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px"><path d="M24 6L38 14V24C38 32 31 39.5 24 42C17 39.5 10 32 10 24V14L24 6Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div><strong>קרן קרן</strong> · סוכנת ביטוח פנסיוני<br>050-242-3356 · wa.me/${WA_NUMBER}</div>
      </div>
      <div class="rep-disclaimer">
        הדוח מסכם נתונים שנמסרו/עודכנו נכון למועד ההפקה ואינו מהווה ייעוץ/שיווק פנסיוני אישי.<br>
        אין באמור התחייבות לתשואה עתידית. תשואות עבר אינן מבטיחות תשואות עתידיות.
      </div>
    </div>`;
}

function kv(label, value, pos) {
  return `<div class="rep-kv"><span>${label}</span><strong class="${pos ? 'pos' : ''}">${value}</strong></div>`;
}

/* ---------- utils ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- demo ---------- */
function loadDemo() {
  document.getElementById('f-name').value = 'ישראל ישראלי';
  document.getElementById('f-id').value = '039285017';
  document.getElementById('f-phone').value = '052-1234567';
  document.getElementById('f-title').value = 'דוח מצב פיננסי — סקירה שנתית 2026';
  document.getElementById('f-summary').value =
    'התיק מאוזן ומנוהל היטב. מומלץ לבחון הפחתת דמי הניהול בקרן ההשתלמות (הראל) שגבוהים מהממוצע בשוק, ולשקול הגדלת ההפקדה החודשית לקרן הפנסיה לקראת פרישה. נקבע לעדכן שוב בעוד 6 חודשים.';
  policies = [
    { _id: ++seq, type: 'קרן פנסיה', company: 'מגדל מקפת', number: '5521180', track: 'מניות עד 50', deposit: '2450', accumulation: '412000', yield: '8.3', fee_deposit: '1.8', fee_balance: '0.15' },
    { _id: ++seq, type: 'קרן השתלמות', company: 'הראל', number: '778120', track: 'כללי', deposit: '1180', accumulation: '96500', yield: '6.9', fee_deposit: '0', fee_balance: '0.72' },
    { _id: ++seq, type: 'גמל להשקעה', company: 'אלטשולר שחם', number: '204451', track: 'מניות', deposit: '900', accumulation: '54300', yield: '9.4', fee_deposit: '0', fee_balance: '0.65' },
  ];
  renderPolicyEditor();
  renderReport();
  toast('נטענו נתוני דוגמה ✓');
}

/* ---------- init ---------- */
document.getElementById('f-date').value = new Date().toISOString().slice(0, 10);
document.querySelectorAll('[data-bind]').forEach(el => el.addEventListener('input', renderReport));
addPolicy();
renderReport();
