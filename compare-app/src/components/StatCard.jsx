import ReturnCell from './ReturnCell.jsx';
export default function StatCard({ label, value, pct, sub, accent }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className={`mt-1 text-xl font-black ${accent || 'text-navy'}`}>{pct != null ? <ReturnCell value={pct} strong /> : value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}
