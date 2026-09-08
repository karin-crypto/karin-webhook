import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtMonthHe, fmtPct } from '../../lib/format.js';
import { AXIS, GRID, tooltipStyle } from './chartTheme.js';

const PERIODS = [{ m: 12, label: 'שנה' }, { m: 36, label: '3 שנים' }, { m: 59, label: '5 שנים' }];

export default function ReturnsChart({ history, color = '#1F6FEB' }) {
  const [months, setMonths] = useState(59);
  const data = useMemo(() => {
    const slice = history.slice(history.length - 1 - months);
    const base = slice[0].value;
    return slice.map(p => ({ date: p.date, v: +((p.value / base - 1) * 100).toFixed(2) }));
  }, [history, months]);
  const last = data[data.length - 1]?.v ?? 0;
  const positive = last >= 0;
  const stroke = positive ? color : '#D9534F';
  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="text-base font-black text-navy">תשואה מצטברת</h3><p className="text-xs text-muted">שינוי מצטבר בערך היחידה לאורך התקופה</p></div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-black ${positive ? 'text-pos' : 'text-neg'}`}>{fmtPct(last)}</span>
          <div className="inline-flex rounded-full border border-line bg-page p-0.5">
            {PERIODS.map(p => <button key={p.m} onClick={() => setMonths(p.m)} className={`rounded-full px-3 py-1 text-xs font-bold ${months === p.m ? 'bg-navy text-white' : 'text-muted hover:text-navy'}`}>{p.label}</button>)}
          </div>
        </div>
      </div>
      <div className="h-64 sm:h-72" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity=".28" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
            <CartesianGrid vertical={false} {...GRID} />
            <XAxis dataKey="date" tickFormatter={d => d.slice(2).replace('-', '/')} tick={AXIS} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis orientation="right" tickFormatter={v => v + '%'} tick={AXIS} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtMonthHe} formatter={v => [fmtPct(v), 'תשואה מצטברת']} />
            <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={2.5} fill="url(#g1)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
