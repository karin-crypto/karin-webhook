/* ========================
   STATE
   ======================== */
const loginScreen    = document.getElementById('loginScreen');
const portalApp      = document.getElementById('portalApp');
const topbarGreeting = document.getElementById('topbarGreeting');
const TODAY = new Date().toLocaleDateString('he-IL', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
const viewDateEl = document.getElementById('todayDate');
if (viewDateEl) viewDateEl.textContent = TODAY;

let currentIdNumber = '';

/* ========================
   HELPERS
   ======================== */
function setLoading(btnId, loading, text) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? 'אנא המתיני...' : text;
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }
}

function getToken() { return sessionStorage.getItem('portal_token'); }
function setToken(t) { sessionStorage.setItem('portal_token', t); }
function clearToken() { sessionStorage.removeItem('portal_token'); }

/* ========================
   STEP 1 – REQUEST OTP
   ======================== */
async function requestOTP() {
  showError('stepIdError', '');
  const idInput = document.getElementById('loginId');
  const id = idInput.value.replace(/\D/g, '').padStart(9, '0');

  if (id.replace(/^0+/, '').length < 5) {
    showError('stepIdError', 'הכניסי מספר תעודת זהות תקין (9 ספרות)');
    return;
  }

  currentIdNumber = id;
  setLoading('btnSendOtp', true, 'שלחי קוד לנייד ←');

  try {
    const res  = await fetch('/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_number: id }),
    });
    const json = await res.json();

    if (!json.ok) {
      showError('stepIdError', json.error || 'שגיאה בשליחת הקוד');
      setLoading('btnSendOtp', false, 'שלחי קוד לנייד ←');
      return;
    }

    // Show OTP step
    document.getElementById('stepId').style.display  = 'none';
    document.getElementById('stepOtp').style.display = 'block';
    document.getElementById('otpPhoneDisplay').textContent = json.phone || 'המספר הרשום';
    document.getElementById('otpInput').focus();
    setLoading('btnSendOtp', false, 'שלחי קוד לנייד ←');

  } catch (err) {
    showError('stepIdError', 'שגיאת חיבור. בדקי אינטרנט ונסי שוב.');
    setLoading('btnSendOtp', false, 'שלחי קוד לנייד ←');
  }
}

async function resendOTP() {
  document.getElementById('stepOtp').style.display = 'none';
  document.getElementById('stepId').style.display  = 'block';
  showError('stepIdError', '');
  showError('stepOtpError', '');
}

/* ========================
   STEP 2 – VERIFY OTP
   ======================== */
async function verifyOTP() {
  showError('stepOtpError', '');
  const otp = document.getElementById('otpInput').value.trim();

  if (otp.length < 6) {
    showError('stepOtpError', 'הכניסי קוד בן 6 ספרות');
    return;
  }

  setLoading('btnVerifyOtp', true, 'כניסה לפורטל ←');

  try {
    const res  = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_number: currentIdNumber, otp }),
    });
    const json = await res.json();

    if (!json.ok) {
      showError('stepOtpError', json.error || 'שגיאה באימות');
      setLoading('btnVerifyOtp', false, 'כניסה לפורטל ←');
      return;
    }

    setToken(json.token);
    await openPortal(json.name);

  } catch (err) {
    showError('stepOtpError', 'שגיאת חיבור. נסי שוב.');
    setLoading('btnVerifyOtp', false, 'כניסה לפורטל ←');
  }
}

/* ========================
   OPEN PORTAL
   ======================== */
async function openPortal(clientName) {
  loginScreen.style.display = 'none';
  portalApp.style.display   = 'flex';
  topbarGreeting.textContent = clientName ? `שלום, ${clientName}` : 'שלום, לקוח/ה יקר/ה';

  // Fetch real client data from backend
  try {
    const res  = await fetch('/api/client/data', {
      headers: { 'Authorization': 'Bearer ' + getToken() }
    });
    const json = await res.json();
    if (json.ok && json.data) {
      renderClientData(json.data, json.name || clientName);
    }
  } catch (e) {
    console.warn('Could not fetch Roeto data – showing demo content');
  }
}

/* ========================
   RENDER ROETO DATA
   ======================== */
function renderClientData(data, name) {
  if (!data) return;

  // Policies in dashboard
  if (data.policies && data.policies.length > 0) {
    const mini = document.querySelector('.policy-mini-list');
    if (mini) {
      mini.innerHTML = data.policies.map(p => `
        <div class="policy-mini">
          <div class="policy-mini-dot" style="background:${policyColor(p.type || p.product_type)}"></div>
          <div class="policy-mini-info">
            <strong>${p.name || p.policy_name || p.type || 'פוליסה'} – ${p.company || p.insurer || ''}</strong>
            <span>${p.track || p.investment_track || p.plan || ''} | עודכן ${formatDate(p.updated_at || p.date)}</span>
          </div>
          <span class="policy-mini-status active">פעיל</span>
        </div>`).join('');
    }

    // Policies view
    const policiesWrap = document.querySelector('.policies-list');
    if (policiesWrap) {
      policiesWrap.innerHTML = data.policies.map(p => `
        <div class="policy-card">
          <div class="policy-header">
            <div class="policy-color" style="background:${policyColor(p.type || p.product_type)}"></div>
            <div class="policy-title">
              <h3>${p.name || p.policy_name || p.type || 'פוליסה'} – ${p.company || p.insurer || ''}</h3>
              <span class="policy-num">מספר פוליסה: ${p.policy_number || p.number || '—'}</span>
            </div>
            <span class="policy-badge active">${p.status || 'פעיל'}</span>
          </div>
          <div class="policy-details">
            ${p.company   ? `<div class="policy-detail"><span>חברה</span><strong>${p.company || p.insurer}</strong></div>` : ''}
            ${p.track     ? `<div class="policy-detail"><span>מסלול</span><strong>${p.track || p.investment_track}</strong></div>` : ''}
            ${p.monthly_deposit  ? `<div class="policy-detail"><span>הפקדה חודשית</span><strong>₪${fmtNum(p.monthly_deposit)}</strong></div>` : ''}
            ${p.accumulation     ? `<div class="policy-detail"><span>צבירה</span><strong>₪${fmtNum(p.accumulation)}</strong></div>` : ''}
            ${p.yield_1y  ? `<div class="policy-detail"><span>תשואה שנתית</span><strong class="yield-pos">+${p.yield_1y}%</strong></div>` : ''}
            ${p.management_fee   ? `<div class="policy-detail"><span>דמי ניהול</span><strong>${p.management_fee}</strong></div>` : ''}
          </div>
        </div>`).join('');
    }

    // Dashboard policy count
    const numPolicies = document.querySelector('.dash-card--blue .dash-num');
    if (numPolicies) numPolicies.textContent = data.policies.length;
  }

  // Documents
  if (data.documents && data.documents.length > 0) {
    const numDocs = document.querySelector('.dash-card--gold .dash-num');
    if (numDocs) numDocs.textContent = data.documents.length;

    // Mini list (dashboard)
    const docMini = document.querySelector('.doc-mini-list');
    if (docMini) {
      docMini.innerHTML = data.documents.slice(0, 3).map(d => `
        <div class="doc-mini">
          <div class="doc-icon">PDF</div>
          <div class="doc-info">
            <strong>${d.name || d.title || 'מסמך'}</strong>
            <span>${d.company || d.source || ''} | ${formatDate(d.date || d.created_at)}</span>
          </div>
          ${d.url ? `<a class="doc-download" href="${d.url}" target="_blank" rel="noopener">↓</a>`
                  : `<button class="doc-download" onclick="showToast('אין קישור להורדה')">↓</button>`}
        </div>`).join('');
    }

    // Full documents grid
    const docsGrid = document.getElementById('docsGrid');
    if (docsGrid) {
      docsGrid.innerHTML = data.documents.map(d => `
        <div class="doc-card" data-type="${d.type || 'מסמך'}">
          <div class="doc-card-icon">PDF</div>
          <div class="doc-card-info">
            <h4>${d.name || d.title || 'מסמך'}</h4>
            <p>${d.company || d.source || ''}</p>
            <span class="doc-date">${formatDate(d.date || d.created_at)}</span>
          </div>
          ${d.url
            ? `<a class="btn btn-primary" style="font-size:.82rem;padding:.5rem 1rem;" href="${d.url}" target="_blank" rel="noopener">הורדה</a>`
            : `<button class="btn btn-primary" style="font-size:.82rem;padding:.5rem 1rem;" onclick="showToast('לא זמין להורדה')">הורדה</button>`}
        </div>`).join('');
    }
  }

  // Yield in dashboard
  const yieldCard = document.querySelector('.dash-card--green .dash-num');
  if (yieldCard && data.policies && data.policies[0] && data.policies[0].yield_1y) {
    yieldCard.textContent = `+${data.policies[0].yield_1y}%`;
  }
}

function policyColor(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('פנסיה') || t.includes('pension'))  return '#1e40af';
  if (t.includes('מנהלים') || t.includes('manager')) return '#16a34a';
  if (t.includes('בריאות') || t.includes('health'))  return '#ea580c';
  if (t.includes('השתלמות') || t.includes('study'))  return '#b45309';
  if (t.includes('גמל') || t.includes('gemel'))       return '#0891b2';
  if (t.includes('ריסק') || t.includes('risk'))       return '#dc2626';
  return '#6d28d9';
}

function fmtNum(n) { return Number(n || 0).toLocaleString('he-IL'); }

function formatDate(raw) {
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'numeric' });
  } catch { return raw; }
}

/* ========================
   AUTO LOGIN (session token stored)
   ======================== */
const savedToken = getToken();
if (savedToken) {
  fetch('/api/client/data', { headers: { 'Authorization': 'Bearer ' + savedToken } })
    .then(r => r.json())
    .then(json => {
      if (json.ok) {
        openPortal(json.name);
      } else {
        clearToken();
      }
    })
    .catch(() => clearToken());
}

/* ========================
   ENTER KEY SUPPORT
   ======================== */
document.getElementById('loginId')?.addEventListener('keydown', e => { if (e.key === 'Enter') requestOTP(); });
document.getElementById('otpInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') verifyOTP(); });

/* ========================
   LOGOUT
   ======================== */
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  const token = getToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    }).catch(() => {});
  }
  clearToken();
  currentIdNumber = '';
  loginScreen.style.display = 'flex';
  portalApp.style.display   = 'none';
  document.getElementById('stepOtp').style.display = 'none';
  document.getElementById('stepId').style.display  = 'block';
  document.getElementById('loginId').value = '';
  document.getElementById('otpInput').value = '';
  showError('stepIdError', '');
  showError('stepOtpError', '');
  topbarGreeting.textContent = 'שלום, לקוח/ה';
});

/* ========================
   SIDEBAR NAV
   ======================== */
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const portalViews  = document.querySelectorAll('.portal-view');

sidebarLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = link.dataset.view;
    sidebarLinks.forEach(l => l.classList.remove('active'));
    portalViews.forEach(v => v.classList.remove('active'));
    link.classList.add('active');
    const view = document.getElementById('view-' + target);
    if (view) view.classList.add('active');
    document.getElementById('portalSidebar').classList.remove('open');
  });
});

/* ========================
   MOBILE SIDEBAR TOGGLE
   ======================== */
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.getElementById('portalSidebar').classList.toggle('open');
});

/* ========================
   DOCUMENT FILTER
   ======================== */
const docFilter = document.getElementById('docTypeFilter');
if (docFilter) {
  docFilter.addEventListener('change', () => {
    const val = docFilter.value;
    document.querySelectorAll('.doc-card').forEach(card => {
      card.style.display = !val || card.dataset.type === val ? '' : 'none';
    });
  });
}

/* ========================
   PORTAL MESSAGE FORM
   ======================== */
const portalMsgForm = document.getElementById('portalMsgForm');
if (portalMsgForm) {
  portalMsgForm.addEventListener('submit', e => {
    e.preventDefault();
    showToast('✓ הפנייה נשלחה לקרן – תחזור/י אלייך בהקדם');
    portalMsgForm.reset();
  });
}

/* ========================
   EMBEDDED CALCULATOR – auto-resize the iframe to its content
   ======================== */
window.addEventListener('message', e => {
  const d = e.data;
  if (d && d.type === 'agr-embed-height' && typeof d.height === 'number') {
    const frame = document.getElementById('agrFrame');
    if (frame) frame.style.height = Math.max(400, d.height + 24) + 'px';
  }
});

/* ========================
   TOAST
   ======================== */
function showToast(msg) {
  const toast = document.getElementById('portalToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function fakeDownload(name) { showToast(`מוריד: ${name}...`); }
