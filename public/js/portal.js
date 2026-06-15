/* ========================
   LOGIN
   ======================== */
const loginScreen = document.getElementById('loginScreen');
const portalApp   = document.getElementById('portalApp');
const loginForm   = document.getElementById('loginForm');
const topbarGreeting = document.getElementById('topbarGreeting');

const TODAY = new Date().toLocaleDateString('he-IL', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
const viewDateEl = document.getElementById('todayDate');
if (viewDateEl) viewDateEl.textContent = TODAY;

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id    = document.getElementById('loginId').value.trim();
  const phone = document.getElementById('loginPhone').value.trim();

  if (id.length < 5 || phone.length < 4) {
    alert('נא למלא את כל השדות');
    return;
  }

  const btn = loginForm.querySelector('button[type="submit"]');
  btn.textContent = 'מתחבר/ת...';
  btn.disabled = true;

  setTimeout(() => {
    loginScreen.style.display = 'none';
    portalApp.style.display   = 'flex';
    topbarGreeting.textContent = `שלום, לקוח/ת יקר/ה`;
    sessionStorage.setItem('portal_auth', '1');
  }, 800);
});

// Keep logged in on page reload (demo only)
if (sessionStorage.getItem('portal_auth')) {
  loginScreen.style.display = 'none';
  portalApp.style.display   = 'flex';
}

/* ========================
   LOGOUT
   ======================== */
document.getElementById('logoutBtn').addEventListener('click', () => {
  sessionStorage.removeItem('portal_auth');
  loginScreen.style.display = 'flex';
  portalApp.style.display   = 'none';
  loginForm.reset();
  document.querySelector('#loginForm button').textContent = 'כניסה לפורטל';
  document.querySelector('#loginForm button').disabled = false;
});

/* ========================
   SIDEBAR NAV
   ======================== */
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const portalViews  = document.querySelectorAll('.portal-view');

sidebarLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.dataset.view;

    sidebarLinks.forEach(l => l.classList.remove('active'));
    portalViews.forEach(v => v.classList.remove('active'));

    link.classList.add('active');
    const view = document.getElementById('view-' + target);
    if (view) view.classList.add('active');

    // close mobile sidebar
    document.getElementById('portalSidebar').classList.remove('open');
  });
});

/* ========================
   MOBILE SIDEBAR TOGGLE
   ======================== */
const sidebarToggle = document.getElementById('sidebarToggle');
const portalSidebar = document.getElementById('portalSidebar');

sidebarToggle.addEventListener('click', () => {
  portalSidebar.classList.toggle('open');
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
   PORTAL MSG FORM
   ======================== */
const portalMsgForm = document.getElementById('portalMsgForm');
if (portalMsgForm) {
  portalMsgForm.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('✓ הפנייה נשלחה לקרן – תחזור/י אלייך בהקדם');
    portalMsgForm.reset();
  });
}

/* ========================
   TOAST
   ======================== */
function showToast(msg) {
  const toast = document.getElementById('portalToast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ========================
   FAKE DOWNLOAD
   ======================== */
function fakeDownload(name) {
  showToast(`מוריד: ${name}...`);
}
