"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-lg border border-line bg-card p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-ink-soft transition-colors hover:bg-brand-tint hover:text-brand-strong"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
