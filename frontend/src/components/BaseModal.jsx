import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

let activeBodyLocks = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';
let previousScrollbarCompensation = '';
let previousScrollbarGutter = '';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    const style = window.getComputedStyle(element);
    return style.visibility !== 'hidden' && style.display !== 'none';
  });
}

function lockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (activeBodyLocks === 0) {
    const scrollbarWidth = Math.max(window.innerWidth - document.documentElement.clientWidth, 0);
    const supportsStableGutter = window.CSS?.supports?.('scrollbar-gutter', 'stable');

    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;
    previousScrollbarCompensation = document.documentElement.style.getPropertyValue('--scrollbar-compensation');
    previousScrollbarGutter = document.documentElement.style.scrollbarGutter;

    document.documentElement.style.setProperty('--scrollbar-compensation', `${scrollbarWidth}px`);
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';

    if (supportsStableGutter) {
      document.documentElement.style.scrollbarGutter = 'stable';
      document.body.classList.remove('modal-scrollbar-padding');
    } else if (scrollbarWidth > 0) {
      document.body.classList.add('modal-scrollbar-padding');
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  activeBodyLocks += 1;

  return () => {
    activeBodyLocks = Math.max(activeBodyLocks - 1, 0);

    if (activeBodyLocks === 0) {
      document.body.classList.remove('modal-open');
      document.body.classList.remove('modal-scrollbar-padding');
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.paddingRight = previousBodyPaddingRight;
      document.documentElement.style.scrollbarGutter = previousScrollbarGutter;

      if (previousScrollbarCompensation) {
        document.documentElement.style.setProperty('--scrollbar-compensation', previousScrollbarCompensation);
      } else {
        document.documentElement.style.removeProperty('--scrollbar-compensation');
      }
    }
  };
}

export default function BaseModal({
  ariaLabel,
  ariaLabelledBy,
  backdropClassName = 'admin-modal-backdrop',
  children,
  className = 'admin-modal',
  disableClose = false,
  onClose,
  show = true,
  size = 'md'
}) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!show) return undefined;
    return lockBodyScroll();
  }, [show]);

  useEffect(() => {
    if (!show) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !disableClose) {
        onClose?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements(modalRef.current);
      if (!focusable.length) {
        event.preventDefault();
        modalRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disableClose, onClose, show]);

  useEffect(() => {
    if (!show) return undefined;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimer = window.setTimeout(() => {
      const modal = modalRef.current;
      const target = modal?.querySelector('[data-autofocus]') || getFocusableElements(modal)[0] || modal;
      target?.focus?.();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      try {
        previousFocusRef.current?.focus?.();
      } catch {
        // Focus target may be removed by navigation or state updates.
      }
    };
  }, [show]);

  if (!show) return null;

  function closeFromBackdrop() {
    if (!disableClose) {
      onClose?.();
    }
  }

  return createPortal(
    <div className={backdropClassName} onClick={closeFromBackdrop}>
      <div
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-modal="true"
        className={className}
        data-modal-size={size}
        ref={modalRef}
        role="dialog"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
