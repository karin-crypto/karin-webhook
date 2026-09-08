import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtMonthHe, fmtPct } from '../../lib/format.js';
import { AXIS, GRID, SERIES, tooltipStyle } from './chartTheme.js';
export default function CompareLineChart({ funds, months = 59 }) {
  const n = funds[0]?.history.length || 0;
  const start = Math.max(0, n - 1 - months);
  const data = [];
  for (let i = start; i < n; i++) {
    const row = { date: funds[0].history[i].date };
    funds.forEach(f => { const base = f.history[start].value; row[f.id] = +((f.history[i].value / base - 1) * 100).toFixed(2); });
    data.push(row);
  }
  return (
    <div className="card p-5">
      <h3 className="text-base font-black text-navy">תשואה מצטברת – 5 שנים</h3>
      <p className="mb-2 text-xs text-muted">כל המסלולים מנורמלים לנקודת התחלה משותפת</p>
      <div className="h-72" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} {...GRID} />
            <XAxis dataKey="date" tickFormatter={d => d.slice(2).replace('-', '/')} tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis orientation="right" tickFormatter={v => v + '%'} tick={AXIS} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtMonthHe} formatter={(v, k) => [fmtPct(v), funds.find(f => f.id === k)?.name || k]} />
            <Legend formatter={k => funds.find(f => f.id === k)?.name || k} wrapperStyle={{ fontFamily: 'Heebo', fontSize: 12, direction: 'rtl' }} />
            {funds.map((f, i) => <Line key={f.id} type="monotone" dataKey={f.id} stroke={SERIES[i]} strokeWidth={2.2} dot={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
