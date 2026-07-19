import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Attempt standard scroll to top
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    
    // Also scroll the specific scrolling element or body if there is a custom wrapper
    const scrollingElement = document.scrollingElement || document.documentElement;
    if (scrollingElement) {
      scrollingElement.scrollTop = 0;
    }
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
