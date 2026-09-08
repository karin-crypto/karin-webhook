import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtPct } from '../../lib/format.js';
import { AXIS, GRID, SERIES, tooltipStyle } from './chartTheme.js';
export default function CompareBarChart({ funds }) {
  const data = [
    { period: 'חודש', ...Object.fromEntries(funds.map(f => [f.id, f.returns.m1])) },
    { period: '12 חודשים', ...Object.fromEntries(funds.map(f => [f.id, f.returns.y1])) },
    { period: '3 שנים (שנתי)', ...Object.fromEntries(funds.map(f => [f.id, f.returns.y3])) },
    { period: '5 שנים (שנתי)', ...Object.fromEntries(funds.map(f => [f.id, f.returns.y5])) },
  ];
  return (
    <div className="card p-5">
      <h3 className="text-base font-black text-navy">תשואות לפי תקופה</h3>
      <p className="mb-2 text-xs text-muted">השוואה ישירה של התשואות בין המסלולים הנבחרים</p>
      <div className="h-72" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} {...GRID} />
            <XAxis dataKey="period" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis orientation="right" tickFormatter={v => v + '%'} tick={AXIS} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, k) => [fmtPct(v), funds.find(f => f.id === k)?.name || k]} />
            <Legend formatter={k => funds.find(f => f.id === k)?.name || k} wrapperStyle={{ fontFamily: 'Heebo', fontSize: 12, direction: 'rtl' }} />
            {funds.map((f, i) => <Bar key={f.id} dataKey={f.id} fill={SERIES[i]} radius={[6, 6, 0, 0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
