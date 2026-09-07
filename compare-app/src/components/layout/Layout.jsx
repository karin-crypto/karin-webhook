import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Header from './Header.jsx';
import Footer from './Footer.jsx';
import CompareBar from '../CompareBar.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <CompareBar />
      <Footer />
    </div>
  );
}
