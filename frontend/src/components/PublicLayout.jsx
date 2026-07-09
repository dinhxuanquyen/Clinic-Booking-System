import { useCallback, useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BackToTop from './BackToTop.jsx';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

export default function PublicLayout() {
  const location = useLocation();

  const resetScroll = useCallback(() => {
    const scrollingElement = document.scrollingElement || document.documentElement;
    scrollingElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    resetScroll();
  }, [location.pathname, resetScroll]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="public-main">
        <div className="public-page-frame">
          <Outlet />
        </div>
      </main>
      <BackToTop />
      <Footer />
    </div>
  );
}
