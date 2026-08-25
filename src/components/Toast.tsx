"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type ToastMessage = { id: number; text: string };

type ToastContextValue = {
  showToast: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Envuelve el árbol una sola vez, en el layout raíz — ver src/app/layout.tsx. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const nextId = useRef(0);

  const showToast = useCallback((text: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, text }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lg"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 flex-shrink-0 text-success" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {toast.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de <ToastProvider>.");
  return context;
}
