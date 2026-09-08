import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { tooltipStyle } from './chartTheme.js';
const LABELS = { stocks: 'מניות', bonds: 'אג"ח', cash: 'מזומן ופיקדונות', alt: 'נכסים אלטרנטיביים' };
const COLORS = { stocks: '#1F6FEB', bonds: '#0B2545', cash: '#5BB0F0', alt: '#1E9E6A' };
export default function AllocationChart({ allocation }) {
  const data = Object.entries(allocation).filter(([, v]) => v > 0).map(([k, v]) => ({ key: k, name: LABELS[k], value: v }));
  return (
    <div className="card p-5">
      <h3 className="text-base font-black text-navy">הרכב השקעות</h3>
      <p className="mb-2 text-xs text-muted">חלוקה משוערת של נכסי המסלול</p>
      <div className="grid items-center gap-4 sm:grid-cols-2">
        <div className="h-52" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="#fff">
              {data.map(d => <Cell key={d.key} fill={COLORS[d.key]} />)}
            </Pie><Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v + '%', n]} /></PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2 text-sm">
          {data.map(d => <li key={d.key} className="flex items-center justify-between"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-sm" style={{ background: COLORS[d.key] }} />{d.name}</span><b className="text-navy">{d.value}%</b></li>)}
        </ul>
      </div>
    </div>
  );
}
