import { useEffect } from 'react';
import { createPortal } from 'react-dom';

let activeBodyLocks = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';
let previousScrollbarCompensation = '';

function lockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (activeBodyLocks === 0) {
    const scrollbarWidth = Math.max(window.innerWidth - document.documentElement.clientWidth, 0);

    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;
    previousScrollbarCompensation = document.documentElement.style.getPropertyValue('--scrollbar-compensation');

    document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  activeBodyLocks += 1;

  return () => {
    activeBodyLocks = Math.max(activeBodyLocks - 1, 0);

    if (activeBodyLocks === 0) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;

      if (previousScrollbarCompensation) {
        document.documentElement.style.setProperty('--scrollbar-compensation', previousScrollbarCompensation);
      } else {
        document.documentElement.style.removeProperty('--scrollbar-compensation');
      }
    }
  };
}

export default function BaseModal({
  backdropClassName = 'admin-modal-backdrop',
  children,
  className = 'admin-modal',
  disableClose = false,
  onClose,
  show = true,
  size = 'md'
}) {
  useEffect(() => {
    if (!show) return undefined;
    return lockBodyScroll();
  }, [show]);

  useEffect(() => {
    if (!show || disableClose) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disableClose, onClose, show]);

  if (!show) return null;

  function closeFromBackdrop() {
    if (!disableClose) {
      onClose?.();
    }
  }

  return createPortal(
    <div className={backdropClassName} onClick={closeFromBackdrop}>
      <div className={className} data-modal-size={size} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body
  );
}
