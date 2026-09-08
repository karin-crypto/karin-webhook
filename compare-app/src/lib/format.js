export const PRODUCT_LABELS = { gemel: 'קופת גמל', hishtalmut: 'קרן השתלמות', pension: 'קרן פנסיה', policy: 'פוליסת חיסכון' };
export const PRODUCT_ORDER = ['hishtalmut', 'gemel', 'pension', 'policy'];
export const PRODUCT_COLORS = { gemel: '#1F6FEB', hishtalmut: '#0B2545', pension: '#1E9E6A', policy: '#7C3AED' };
export const RISK_LABELS = { 1: 'נמוך מאוד', 2: 'נמוך', 3: 'בינוני', 4: 'גבוה', 5: 'גבוה מאוד' };

export const fmtPct = (n, { sign = true, digits = 2 } = {}) => {
  if (n == null || Number.isNaN(n)) return '–';
  const s = (sign && n > 0 ? '+' : '') + n.toFixed(digits) + '%';
  return s;
};
export const pctTone = n => (n > 0 ? 'text-pos' : n < 0 ? 'text-neg' : 'text-muted');
export const pctBg = n => (n > 0 ? 'bg-pos-bg text-pos' : n < 0 ? 'bg-neg-bg text-neg' : 'bg-page text-muted');
export const fmtFee = n => (n == null ? '–' : n.toFixed(2) + '%');
export const fmtAssets = m => {
  if (m == null) return '–';
  if (m >= 1000) return '₪' + (m / 1000).toLocaleString('he-IL', { maximumFractionDigits: 1 }) + ' מיליארד';
  return '₪' + m.toLocaleString('he-IL') + ' מיליון';
};
export const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return `${m}/${y}`; };
export const fmtMonthHe = (ym) => {
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  const [y, m] = ym.split('-'); return `${months[+m - 1]} ${y}`;
};
export const cx = (...a) => a.filter(Boolean).join(' ');
