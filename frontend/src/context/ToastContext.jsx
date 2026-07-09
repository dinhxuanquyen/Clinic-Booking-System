import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

const toastClasses = {
  success: 'text-bg-success',
  error: 'text-bg-danger',
  warning: 'text-bg-warning',
  info: 'text-bg-primary'
};

function ToastNotification({ toast, onClose }) {
  return (
    <div className={`toast show align-items-center border-0 shadow ${toastClasses[toast.type] || toastClasses.info}`} role="alert" aria-live="assertive" aria-atomic="true">
      <div className="d-flex">
        <div className="toast-body">{toast.message}</div>
        <button type="button" className="btn-close btn-close-white me-2 m-auto" aria-label="Close" onClick={() => onClose(toast.id)} />
      </div>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((type, message) => {
    if (!message) return;

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, type, message }]);
    window.setTimeout(() => removeToast(id), 3000);
  }, [removeToast]);

  const value = useMemo(() => ({
    notify,
    success: (message) => notify('success', message),
    error: (message) => notify('error', message),
    warning: (message) => notify('warning', message),
    info: (message) => notify('info', message)
  }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container app-toast-container admin-toast-container">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
