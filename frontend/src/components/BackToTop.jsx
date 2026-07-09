import { useEffect, useState } from 'react';
import { FaArrowUp } from './icons/FaIcons.jsx';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 300);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
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
