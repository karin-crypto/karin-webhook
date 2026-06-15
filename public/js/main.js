/* ========================
   NAVBAR SCROLL
   ======================== */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

/* ========================
   HAMBURGER MENU
   ======================== */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

function closeMobile() {
  mobileMenu.classList.remove('open');
}

/* ========================
   CONTACT FORM
   ======================== */
const contactForm = document.getElementById('contactForm');
const formSuccess = document.getElementById('formSuccess');

const WA_NUMBER = '972502423356';
const TOPIC_LABELS = {
  pension: 'קרן פנסיה', gemel: 'קופת גמל',
  'bituach-menahalim': 'ביטוח מנהלים',
  hishtalmut: 'קרן השתלמות',
  'insurance-life': 'ביטוח חיים',
  'insurance-health': 'ביטוח בריאות',
  risk: 'ניהול סיכונים', other: 'אחר'
};

if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'שולח...';

    const name    = document.getElementById('name').value;
    const phone   = document.getElementById('phone').value;
    const email   = document.getElementById('email').value;
    const topic   = document.getElementById('topic').value;
    const message = document.getElementById('message').value;

    const waText = encodeURIComponent(
      `שלום קרן!\nפנייה חדשה מהאתר:\n` +
      `שם: ${name}\nטלפון: ${phone}\n` +
      (email   ? `אימייל: ${email}\n` : '') +
      (topic   ? `נושא: ${TOPIC_LABELS[topic] || topic}\n` : '') +
      (message ? `הודעה: ${message}` : '')
    );

    // Try server API first, fall back to direct WhatsApp
    let waUrl = `https://wa.me/${WA_NUMBER}?text=${waText}`;
    try {
      const res  = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, topic, message }),
      });
      const json = await res.json();
      if (json.ok) waUrl = json.waUrl;
    } catch { /* static hosting – use direct WhatsApp link */ }

    formSuccess.classList.add('show');
    contactForm.reset();
    btn.disabled = false;
    btn.textContent = 'שליחה ←';
    setTimeout(() => window.open(waUrl, '_blank'), 600);
  });
}

/* ========================
   FINANCIAL PRODUCTS TABS
   ======================== */
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

/* ========================
   TABLE FILTERING
   ======================== */
document.querySelectorAll('.table-wrap').forEach(wrap => {
  const table = wrap.querySelector('.fin-table tbody');
  const panel = wrap.closest('.tab-panel');
  if (!panel) return;

  const companyFilter = panel.querySelector('.filter-company');
  const searchInput = panel.querySelector('.search-input');

  function filterTable() {
    const company = companyFilter ? companyFilter.value.toLowerCase() : '';
    const search = searchInput ? searchInput.value.toLowerCase() : '';
    const rows = table.querySelectorAll('tr');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const companyCell = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
      const matchCompany = !company || companyCell.includes(company);
      const matchSearch = !search || text.includes(search);
      row.style.display = matchCompany && matchSearch ? '' : 'none';
    });
  }

  if (companyFilter) companyFilter.addEventListener('change', filterTable);
  if (searchInput) searchInput.addEventListener('input', filterTable);
});

/* ========================
   TABLE SORT
   ======================== */
document.querySelectorAll('.fin-table').forEach(table => {
  let sortCol = null;
  let sortAsc = true;

  table.querySelectorAll('th.sortable').forEach((th, idx) => {
    th.addEventListener('click', () => {
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      if (sortCol === idx) sortAsc = !sortAsc;
      else { sortCol = idx; sortAsc = true; }

      table.querySelectorAll('th.sortable').forEach(t => {
        const icon = t.querySelector('.sort-icon');
        if (icon) icon.textContent = '⇅';
      });
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = sortAsc ? '↑' : '↓';

      rows.sort((a, b) => {
        const aVal = a.querySelectorAll('td')[idx]?.textContent.replace(/[^0-9.\-]/g, '') || '';
        const bVal = b.querySelectorAll('td')[idx]?.textContent.replace(/[^0-9.\-]/g, '') || '';
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) return sortAsc ? aNum - bNum : bNum - aNum;
        return sortAsc ? aVal.localeCompare(bVal, 'he') : bVal.localeCompare(aVal, 'he');
      });

      rows.forEach(row => tbody.appendChild(row));
    });
  });
});

/* ========================
   CALCULATOR TABS
   ======================== */
const calcTabs   = document.querySelectorAll('.calc-tab');
const calcPanels = document.querySelectorAll('.calc-panel');

calcTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.calc;
    calcTabs.forEach(t => t.classList.remove('active'));
    calcPanels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('calc-' + target).classList.add('active');
  });
});

/* ========================
   PENSION CALCULATOR
   ======================== */
function fmt(n) {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

function calcPension() {
  const age      = +document.getElementById('pc-age').value;
  const retire   = +document.getElementById('pc-retire').value;
  const salary   = +document.getElementById('pc-salary').value;
  const contrib  = +document.getElementById('pc-contrib').value / 100;
  const yieldPct = +document.getElementById('pc-yield').value / 100;
  const existing = +document.getElementById('pc-existing').value;

  const years    = Math.max(0, retire - age);
  const monthly  = salary * contrib;
  const r        = yieldPct / 12;
  const n        = years * 12;

  let total = existing * Math.pow(1 + yieldPct, years);
  if (r > 0) total += monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  else        total += monthly * n;

  const deposits = monthly * n + existing;
  const profit   = total - deposits;

  document.getElementById('pc-years').textContent   = years + ' שנים';
  document.getElementById('pc-monthly').textContent  = fmt(monthly);
  document.getElementById('pc-deposits').textContent = fmt(deposits);
  document.getElementById('pc-profit').textContent   = fmt(Math.max(0, profit));
  document.getElementById('pc-total').textContent    = fmt(total);
  document.getElementById('pc-pension').textContent  = fmt(total / 240);
}

['pc-age','pc-retire','pc-salary','pc-contrib','pc-yield','pc-existing'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const out = document.getElementById(id + '-out');
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    if (id === 'pc-salary' || id === 'pc-existing') out.value = v.toLocaleString('he-IL');
    else if (id === 'pc-contrib' || id === 'pc-yield') out.value = v + '%';
    else out.value = v;
    calcPension();
  });
});
calcPension();

/* ========================
   SAVINGS CALCULATOR
   ======================== */
function calcSavings() {
  const monthly  = +document.getElementById('sc-monthly').value;
  const years    = +document.getElementById('sc-years').value;
  const yieldPct = +document.getElementById('sc-yield').value / 100;
  const init     = +document.getElementById('sc-init').value;

  const r = yieldPct / 12;
  const n = years * 12;

  let total = init * Math.pow(1 + yieldPct, years);
  if (r > 0) total += monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  else        total += monthly * n;

  const deposits = monthly * n + init;
  const profit   = total - deposits;

  document.getElementById('sc-deposits').textContent = fmt(deposits);
  document.getElementById('sc-profit').textContent   = fmt(Math.max(0, profit));
  document.getElementById('sc-total').textContent    = fmt(total);
  document.getElementById('sc-multi').textContent    = deposits > 0 ? '×' + (total / deposits).toFixed(1) : '×1';
}

['sc-monthly','sc-years','sc-yield','sc-init'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const out = document.getElementById(id + '-out');
  el.addEventListener('input', () => {
    const v = parseFloat(el.value);
    if (id === 'sc-monthly' || id === 'sc-init') out.value = v.toLocaleString('he-IL');
    else if (id === 'sc-yield') out.value = v + '%';
    else out.value = v;
    calcSavings();
  });
});
calcSavings();

/* ========================
   SCROLL ANIMATIONS
   ======================== */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.service-card, .testimonial-card, .stat').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity .5s ease, transform .5s ease';
  observer.observe(el);
});
