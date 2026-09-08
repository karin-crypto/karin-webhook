import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import Logo from '../Logo.jsx';
import { useCompare } from '../../lib/compare.jsx';

const links = [
  { to: '/', label: 'בית', end: true },
  { to: '/funds', label: 'השוואת מסלולים' },
  { to: '/compare', label: 'כלי השוואה' },
  { to: '/articles', label: 'מאמרים' },
  { to: '/contact', label: 'צור קשר' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { count } = useCompare();
  const cls = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-ice text-navy' : 'text-muted hover:bg-ice hover:text-navy'}`;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="קרין קרן – תכנון פיננסי"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="ניווט ראשי">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.end} className={cls}>
              {l.label}{l.to === '/compare' && count > 0 && <span className="ms-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue px-1.5 text-[11px] font-black text-white">{count}</span>}
            </NavLink>
          ))}
          <Link to="/contact" className="btn-primary ms-2 !py-2">בדקי לי איפה כדאי להשקיע</Link>
        </nav>
        <button className="md:hidden rounded-lg border border-line p-2" aria-label="תפריט" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
        </button>
      </div>
      {open && (
        <div className="border-t border-line bg-white md:hidden">
          <nav className="container-x flex flex-col py-2" aria-label="ניווט מובייל">
            {links.map(l => <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)} className={cls}>{l.label}{l.to === '/compare' && count > 0 ? ` (${count})` : ''}</NavLink>)}
            <Link to="/contact" onClick={() => setOpen(false)} className="btn-primary mt-2">בדקי לי איפה כדאי להשקיע</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
