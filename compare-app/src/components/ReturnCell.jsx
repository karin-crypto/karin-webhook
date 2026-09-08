import { fmtPct, pctTone, cx } from '../lib/format.js';
export default function ReturnCell({ value, strong = false, badge = false }) {
  if (value == null) return <span className="text-muted">–</span>;
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '';
  if (badge) return <span className={cx('inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm font-extrabold', value > 0 ? 'bg-pos-bg text-pos' : value < 0 ? 'bg-neg-bg text-neg' : 'bg-page text-muted')}><span className="text-[10px]">{arrow}</span>{fmtPct(value)}</span>;
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap', pctTone(value), strong ? 'font-extrabold' : 'font-bold')}><span className="text-[10px]">{arrow}</span>{fmtPct(value)}</span>;
}
