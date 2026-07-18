import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

let activeBodyLocks = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';
let previousScrollbarCompensation = '';
let previousScrollbarGutter = '';
let bodyLockReconcileTimer = null;

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

function hasActiveModalElement() {
  return Boolean(document.querySelector('[data-cb-modal="true"]'));
}

function restoreBodyScroll({ forceClear = false } = {}) {
  document.body.classList.remove('modal-open');
  document.body.classList.remove('modal-scrollbar-padding');
  document.body.style.overflow = forceClear ? '' : previousBodyOverflow;
  document.body.style.paddingRight = forceClear ? '' : previousBodyPaddingRight;
  document.documentElement.style.scrollbarGutter = forceClear ? '' : previousScrollbarGutter;

  if (!forceClear && previousScrollbarCompensation) {
    document.documentElement.style.setProperty('--scrollbar-compensation', previousScrollbarCompensation);
  } else {
    document.documentElement.style.removeProperty('--scrollbar-compensation');
  }
}

function scheduleBodyLockReconcile() {
  if (bodyLockReconcileTimer) {
    window.clearTimeout(bodyLockReconcileTimer);
  }

  bodyLockReconcileTimer = window.setTimeout(() => {
    bodyLockReconcileTimer = null;

    if (!hasActiveModalElement()) {
      activeBodyLocks = 0;
      restoreBodyScroll({ forceClear: true });
    }
  }, 0);
}

function lockBodyScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (activeBodyLocks > 0 && !hasActiveModalElement()) {
    activeBodyLocks = 0;
    restoreBodyScroll({ forceClear: true });
  }

  if (activeBodyLocks === 0) {
    const scrollbarWidth = Math.max(window.innerWidth - document.documentElement.clientWidth, 0);
    const supportsStableGutter = window.CSS?.supports?.('scrollbar-gutter', 'stable');

    previousBodyOverflow = document.body.classList.contains('modal-open') ? '' : document.body.style.overflow;
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
      restoreBodyScroll();
    }

    scheduleBodyLockReconcile();
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
  const resolvedAriaLabel = ariaLabel || (ariaLabelledBy ? undefined : 'Hộp thoại');

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
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-modal="true"
        className={className}
        data-cb-modal="true"
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
