import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollRootToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

  const scrollTargets = [
    document.scrollingElement,
    document.documentElement,
    document.body,
    document.getElementById('root'),
    document.querySelector('.app-shell'),
    document.querySelector('.public-main'),
    document.querySelector('.public-page-frame')
  ].filter(Boolean);

  scrollTargets.forEach((element) => {
    element.scrollTop = 0;
    element.scrollLeft = 0;
  });
}

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    scrollRootToTop();

    const frameId = window.requestAnimationFrame(scrollRootToTop);
    const timeoutId = window.setTimeout(scrollRootToTop, 80);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [pathname, search]);

  useEffect(() => {
    const timeoutId = window.setTimeout(scrollRootToTop, 160);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pathname, search]);

  return null;
}
