import { useEffect, useState } from 'react';
import { FaArrowUp } from './icons/FaIcons.jsx';

function getScrollTargets() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return [];
  }

  return Array.from(
    new Set(
      [
        window,
        document.scrollingElement,
        document.documentElement,
        document.body,
        document.getElementById('root'),
        document.querySelector('.app-shell'),
        document.querySelector('.public-main'),
        document.querySelector('.public-page-frame')
      ].filter(Boolean)
    )
  );
}

function getScrollTop(target) {
  if (target === window) {
    return window.scrollY || window.pageYOffset || 0;
  }

  return target.scrollTop || 0;
}

function scrollTargetToTop(target) {
  if (target === window) {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    return;
  }

  if (typeof target.scrollTo === 'function') {
    target.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    return;
  }

  target.scrollTop = 0;
  target.scrollLeft = 0;
}

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frameId = 0;
    const scrollTargets = getScrollTargets();

    function updateVisibility() {
      frameId = 0;
      setVisible(Math.max(...scrollTargets.map(getScrollTop), 0) > 300);
    }

    function scheduleUpdate() {
      if (!frameId) {
        frameId = window.requestAnimationFrame(updateVisibility);
      }
    }

    updateVisibility();
    scrollTargets.forEach((target) => {
      target.addEventListener?.('scroll', scheduleUpdate, { passive: true });
    });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      scrollTargets.forEach((target) => {
        target.removeEventListener?.('scroll', scheduleUpdate);
      });
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  function scrollToTop() {
    getScrollTargets().forEach(scrollTargetToTop);
  }

  return (
    <button
      aria-label="Quay lại đầu trang"
      className={`back-to-top ${visible ? 'is-visible' : ''}`}
      onClick={scrollToTop}
      type="button"
    >
      <FaArrowUp size={20} />
    </button>
  );
}
