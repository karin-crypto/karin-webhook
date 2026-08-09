/* =========================================================
   כלי השוואה – לוגיקה
   Side-by-side comparison with automatic best-value highlighting.
   The table structure is built once per add/remove; typing only
   recomputes winners + scores in place so inputs never lose focus.
   ======================================================== */
'use strict';

/* metric rows. dir: 'high' = higher wins, 'low' = lower wins, null = no winner */
const METRICS = [
  { key: 'type',        label: 'סוג / מוצר',        hint: '',          type: 'text',   dir: null,   placeholder: 'קרן פנסיה' },
  { key: 'track',       label: 'מסלול השקעה',       hint: '',          type: 'text',   dir: null,   placeholder: 'כללי / מניות' },
  { key: 'deposit',     label: 'הפקדה חודשית',      hint: '₪',         type: 'number', dir: null,   placeholder: '0' },
  { key: 'accumulation',label: 'צבירה',             hint: 'גבוה עדיף', type: 'number', dir: 'high', placeholder: '0' },
  { key: 'yield',       label: 'תשואה שנתית',       hint: 'גבוה עדיף', type: 'number', dir: 'high', placeholder: '0' },
  { key: 'fee_deposit', label: 'דמי ניהול מהפקדה',  hint: 'נמוך עדיף', type: 'number', dir: 'low',  placeholder: '0' },
  { key: 'fee_balance', label: 'דמי ניהול מצבירה',  hint: 'נמוך עדיף', type: 'number', dir: 'low',  placeholder: '0' },
];

let options = [];
let seq = 0;

function blankOption(name) {
  const o = { _id: ++seq, name: name || '' };
  METRICS.forEach(m => o[m.key] = '');
  return o;
}

const toNum = v => { const n = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isNaN(n) ? null : n; };

/* winners (indexes) for one metric */
function winnersFor(metric) {
  if (!metric.dir) return new Set();
  const vals = options.map(o => toNum(o[metric.key]));
  const present = vals.filter(v => v !== null);
  if (present.length < 2) return new Set();
  const target = metric.dir === 'high' ? Math.max(...present) : Math.min(...present);
  const winners = new Set();
  vals.forEach((v, i) => { if (v !== null && v === target) winners.add(i); });
  if (winners.size === options.length) return new Set(); // all tie → no winner
  return winners;
}

/* ---------- build the table structure ---------- */
function renderTable() {
  const table = document.getElementById('cmpTable');

  let html = '<thead><tr><th class="cmp-colhead cmp-rowlabel">אפשרות</th>';
  options.forEach((o, i) => {
    html += `<th class="cmp-colhead cmp-data">
      <div class="cmp-col-title">
        <input value="${esc(o.name)}" placeholder="אפשרות ${i + 1}" oninput="setName(${o._id}, this.value)" />
        <div class="cmp-col-actions">
          ${options.length > 1 ? `<button class="cmp-remove" title="הסרה" onclick="removeOption(${o._id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>` : ''}
        </div>
      </div></th>`;
  });
  html += '</tr></thead><tbody>';

  METRICS.forEach(m => {
    html += `<tr><td class="cmp-rowlabel">${m.label}${m.hint ? `<small>${m.hint}</small>` : ''}</td>`;
    options.forEach((o, i) => {
      const inputMode = m.type === 'number' ? ' inputmode="decimal"' : '';
      html += `<td class="cmp-data" data-col="${i}" data-key="${m.key}">
        <input${inputMode} value="${esc(o[m.key])}" placeholder="${m.placeholder}" oninput="setVal(${o._id},'${m.key}',this.value)" />
        <span class="cmp-win-tag hidden"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>המשתלם ביותר</span>
      </td>`;
    });
    html += '</tr>';
  });

  // score row
  html += '<tr class="cmp-score-row"><td class="cmp-rowlabel">ניקוד כולל<small>מס׳ קטגוריות מנצחות</small></td>';
  options.forEach((o, i) => {
    html += `<td class="cmp-data" data-score-col="${i}">
      <div class="cmp-score"><span class="cmp-score-num">0</span></div>
    </td>`;
  });
  html += '</tr></tbody>';

  table.innerHTML = html;
  updateHighlights();
}

/* ---------- recompute winners + scores in place (no rebuild) ---------- */
function updateHighlights() {
  const highlight = document.getElementById('highlightToggle').checked;
  const scores = options.map(() => 0);

  METRICS.forEach(m => {
    const winners = winnersFor(m);
    winners.forEach(i => scores[i]++);
    options.forEach((o, i) => {
      const cell = document.querySelector(`.cmp-data[data-col="${i}"][data-key="${m.key}"]`);
      if (!cell) return;
      const win = highlight && winners.has(i);
      cell.classList.toggle('cmp-win', win);
      cell.querySelector('.cmp-win-tag').classList.toggle('hidden', !win);
    });
  });

  const maxScore = Math.max(0, ...scores);
  options.forEach((o, i) => {
    const cell = document.querySelector(`.cmp-data[data-score-col="${i}"]`);
    if (!cell) return;
    const best = highlight && maxScore > 0 && scores[i] === maxScore;
    cell.innerHTML = `<div class="cmp-score ${best ? 'cmp-best' : ''}">
      <span class="cmp-score-num">${scores[i]}</span>
      ${best ? '<span class="cmp-score-badge">★ מומלץ</span>' : ''}
    </div>`;
  });
}

/* ---------- mutations ---------- */
function setName(id, v) { const o = options.find(x => x._id === id); if (o) o.name = v; }
function setVal(id, key, v) { const o = options.find(x => x._id === id); if (o) o[key] = v; updateHighlights(); }

function addOption() {
  if (options.length >= 4) { toast('אפשר להשוות עד 4 אפשרויות'); return; }
  options.push(blankOption());
  renderTable();
}
function removeOption(id) {
  options = options.filter(o => o._id !== id);
  renderTable();
}

/* ---------- utils ---------- */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- demo ---------- */
function loadDemo() {
  options = [
    { _id: ++seq, name: 'מגדל מקפת',   type: 'קרן פנסיה', track: 'מניות עד 50', deposit: '2450', accumulation: '412000', yield: '8.3', fee_deposit: '1.8',  fee_balance: '0.15' },
    { _id: ++seq, name: 'מנורה מבטחים', type: 'קרן פנסיה', track: 'מניות עד 50', deposit: '2450', accumulation: '405000', yield: '9.1', fee_deposit: '1.49', fee_balance: '0.11' },
    { _id: ++seq, name: 'אלטשולר שחם',  type: 'קרן פנסיה', track: 'מניות עד 50', deposit: '2450', accumulation: '398000', yield: '9.6', fee_deposit: '1.75', fee_balance: '0.2'  },
  ];
  renderTable();
  toast('נטענו נתוני דוגמה ✓');
}

/* ---------- init ---------- */
options = [blankOption(), blankOption()];
renderTable();
