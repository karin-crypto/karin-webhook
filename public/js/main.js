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

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = contactForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'שולח...';
    setTimeout(() => {
      formSuccess.classList.add('show');
      contactForm.reset();
      btn.disabled = false;
      btn.textContent = 'שליחה ←';
    }, 900);
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
