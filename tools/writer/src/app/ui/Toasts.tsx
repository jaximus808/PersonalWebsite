// Brief messages at the bottom of the screen ("Copied", "Moved to trash",
// an upload that failed). They fade on their own; errors stay a little longer.

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

import { Icon } from "./Icon";

type Tone = "info" | "success" | "error";
type Toast = { id: number; message: string; tone: Tone };

type ToastApi = (message: string, tone?: Tone) => void;

const ToastContext = createContext<ToastApi>(() => {});

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ToastApi>(
    (message, tone = "info") => {
      const id = nextId.current++;
      // Same message twice in a row: keep one.
      setToasts((list) => [...list.filter((toast) => toast.message !== message), { id, message, tone }].slice(-3));
      window.setTimeout(() => dismiss(id), tone === "error" ? 7000 : 2600);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`}>
            {toast.tone === "error" ? <Icon name="alert" /> : toast.tone === "success" ? <Icon name="check" /> : null}
            <span>{toast.message}</span>
            <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
