/* Shared returns table for product pages.
   Data: inline <script id="returns-data" type="application/json"> (preview builds)
         or data/returns.json (site). One data file feeds every page. */
(function () {
  async function load() {
    const inline = document.getElementById('returns-data');
    if (inline) return JSON.parse(inline.textContent);
    const r = await fetch('data/returns.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const clamp = n => Math.max(0, Math.min(5, n | 0));
  const stars = n => '★'.repeat(clamp(n)) + '☆'.repeat(5 - clamp(n));
  const num = (row, col) => { const t = (row.children[col]?.textContent || '').replace(/[^0-9.\-]/g, ''); const n = parseFloat(t); return isNaN(n) ? -Infinity : n; };

  function render(table, data) {
    const cat = data.categories[table.dataset.cat]; if (!cat) return;
    const tbody = table.querySelector('tbody');
    const rows = [...cat.rows].sort((a, b) => b.y1 - a.y1);
    tbody.innerHTML = rows.map(r =>
      '<tr><td><div class="company-logo-cell"><div class="company-dot" style="background:' + (data.meta.companies[r.company] || '#64748b') + '"></div>' + r.company + '</div></td>' +
      '<td><span class="track-badge">' + r.track + '</span></td>' +
      '<td class="yield-pos">' + r.y1.toFixed(1) + '%</td><td class="yield-pos">' + r.y3.toFixed(1) + '%</td><td class="yield-pos">' + r.y5.toFixed(1) + '%</td>' +
      '<td class="sharpe-cell">' + r.sharpe.toFixed(2) + '</td><td class="stars-cell">' + stars(r.service) + '</td></tr>').join('');

    // company filter options from data
    const panel = table.closest('.tab-panel') || document;
    const sel = panel.querySelector('.filter-company');
    if (sel) {
      const companies = [...new Set(rows.map(r => r.company))];
      sel.innerHTML = '<option value="">כל החברות</option>' + companies.map(c => '<option value="' + c + '">' + c + '</option>').join('');
    }
    const search = panel.querySelector('.search-input');
    function filter() {
      const c = sel ? sel.value : '', s = search ? search.value.trim() : '';
      tbody.querySelectorAll('tr').forEach(tr => {
        const company = tr.querySelector('.company-logo-cell')?.textContent.trim() || '';
        tr.style.display = (!c || company === c) && (!s || tr.textContent.includes(s)) ? '' : 'none';
      });
    }
    if (sel) sel.addEventListener('change', filter);
    if (search) search.addEventListener('input', filter);

    // sort
    let sortCol = 2, sortDir = -1;
    const ths = table.querySelectorAll('th.sortable');
    function paint() { ths.forEach(th => { const i = th.querySelector('.sort-icon'); const col = [...th.parentNode.children].indexOf(th); if (i) i.textContent = col === sortCol ? (sortDir === -1 ? '▼' : '▲') : '⇅'; th.classList.toggle('sorted', col === sortCol); }); }
    ths.forEach(th => th.addEventListener('click', () => {
      const col = [...th.parentNode.children].indexOf(th);
      if (col === sortCol) sortDir = -sortDir; else { sortCol = col; sortDir = -1; }
      [...tbody.querySelectorAll('tr')].sort((a, b) => sortDir * (num(a, col) - num(b, col))).forEach(r => tbody.appendChild(r));
      paint();
    }));
    paint();
  }

  function meta(data) {
    document.querySelectorAll('.data-meta').forEach(el => {
      const m = data.meta;
      el.innerHTML = (m.verified ? '<span class="tag ok">✓ נתונים רשמיים</span>' : '<span class="tag demo">נתוני המחשה</span>') +
        (m.asOf ? '<span>עודכן: ' + m.asOf + '</span>' : '') + (m.source ? '<span>מקור: ' + m.source + '</span>' : '');
    });
  }

  load().then(data => { document.querySelectorAll('table[data-cat]').forEach(t => render(t, data)); meta(data); })
    .catch(err => { console.error('returns data failed', err); document.querySelectorAll('.data-meta').forEach(el => el.textContent = 'טעינת הנתונים נכשלה.'); });
})();
