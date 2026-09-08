import { Link } from 'react-router-dom';
const items = [
  { p: 'gemel', label: 'קופות גמל', icon: 'M3 3v18h18M7 15l4-4 3 3 5-6' },
  { p: 'hishtalmut', label: 'קרנות השתלמות', icon: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { p: 'pension', label: 'פנסיה', icon: 'M12 3l7 4v5c0 4.5-3 8-7 9-4-1-7-4.5-7-9V7l7-4zM9 12l2 2 4-4' },
  { p: 'policy', label: 'פוליסות חיסכון', icon: 'M4 6h16v12H4zM4 10h16M8 15h4' },
];
export default function QuickLinks({ compact = false }) {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
      {items.map(it => (
        <Link key={it.p} to={`/funds?product=${it.p}`} className="card group flex items-center gap-3 p-3.5 transition hover:-translate-y-0.5 hover:border-blue hover:shadow-pop">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ice text-navy group-hover:bg-blue group-hover:text-white transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={it.icon} /></svg>
          </span>
          <span className="text-sm font-extrabold text-navy">{it.label}</span>
        </Link>
      ))}
    </div>
  );
}
