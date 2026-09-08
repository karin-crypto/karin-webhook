import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import CompareBar from '../CompareBar.jsx';
import { useCompare } from '../../lib/compare.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  const { count } = useCompare();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className={`flex-1 ${count > 0 && pathname !== '/compare' ? 'pb-28 sm:pb-24' : ''}`}><Outlet /></main>
      <CompareBar />
      <Footer />
    </div>
  );
}
