"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Ancho máximo del diálogo (clase de Tailwind) — "max-w-md" por defecto para
   * los formularios admin; contenido más ancho (ej. video) puede pedir "max-w-2xl". */
  maxWidthClassName?: string;
};

export function Modal({ open, onClose, title, children, maxWidthClassName = "max-w-md" }: ModalProps) {
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
        className={cn("flex w-full flex-col rounded-lg border border-line bg-card p-6 shadow-lg", maxWidthClassName)}
        style={{ maxHeight: "min(85vh, 100%)" }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex flex-shrink-0 items-center justify-between gap-4">
          {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto grid h-7 w-7 place-items-center rounded-md text-ink-soft transition-colors hover:bg-brand-tint hover:text-brand-strong"
          >
                        <Icon name="close" size="md" />
          </button>
        </div>
        {/* Solo esta parte scrollea — el header (título + cerrar) queda fijo arriba.
            Antes el panel entero no tenía límite de alto: con contenido largo (ej.
            "Vista previa" de un campo con imágenes embebidas) la mitad quedaba
            arriba del viewport, sin scroll posible, y el botón de guardar era
            inalcanzable. */}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
