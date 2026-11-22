import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

const ICONS = { success: "✓", error: "!", warning: "i", info: "i" };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, message, timeout = 5000) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, type, message }]);
      if (timeout > 0) {
        window.setTimeout(() => dismiss(id), timeout);
      }
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      push,
      success: (message) => push("success", message),
      error: (message) => push("error", message, 7000),
      warning: (message) => push("warning", message, 6000),
      info: (message) => push("info", message),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`alert alert--${toast.type}`}>
            <span className="alert-icon" aria-hidden="true">
              {ICONS[toast.type] || "i"}
            </span>
            <p>{toast.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}
