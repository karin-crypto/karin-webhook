import { RISK_LABELS } from '../lib/format.js';
const tone = { 1: 'bg-pos', 2: 'bg-pos', 3: 'bg-sky', 4: 'bg-amber-500', 5: 'bg-neg' };
export default function RiskBadge({ level, showLabel = true }) {
  return (
    <span className="inline-flex items-center gap-2" title={`רמת סיכון ${level}/5 – ${RISK_LABELS[level]}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(i => <i key={i} className={`block h-3 w-1.5 rounded-sm ${i <= level ? tone[level] : 'bg-line'}`} />)}
      </span>
      {showLabel && <span className="text-xs font-semibold text-muted">{RISK_LABELS[level]}</span>}
    </span>
  );
}
