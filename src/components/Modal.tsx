"use client";

import { useEffect, useId, useRef } from "react";
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
  /**
   * false bloquea cerrar con click afuera, Escape, o la "X" del header —
   * solo queda la vía que el propio contenido decida (ej. un botón "Ya la
   * copié, cerrar" con su propio onClick a onClose). Pensado para contenido
   * de una sola oportunidad que no se puede recuperar si se pierde por un
   * cierre accidental — el caso real: el link/mensaje de una invitación
   * recién creada (el token crudo no se persiste, ver token.ts), que hasta
   * ahora se perdía para siempre con un click afuera del modal por error.
   * Default true (el resto de los modales del admin sigue igual).
   */
  dismissible?: boolean;
};

// Lo que el navegador deja enfocar con Tab — se filtra además por
// visibilidad al usarlo (un campo dentro de un bloque oculto no cuenta).
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.getClientRects().length > 0);
}

// Pila de modales abiertos (a nivel de módulo, no estado de React): con un
// modal anidado (ConfirmModal sobre ContentForm) los dos escuchan el teclado
// en `document`, y solo el de arriba debe atrapar Tab y cerrar con Escape.
// Antes Escape cerraba los dos a la vez.
const openModalStack: symbol[] = [];

export function Modal({ open, onClose, title, children, maxWidthClassName = "max-w-md", dismissible = true }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // En refs para que el efecto de foco dependa solo de `open`: onClose
  // cambia de identidad en cada render del padre, y volver a correr el
  // efecto por eso movería el foco al primer campo en medio de la escritura.
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const id = Symbol("modal");
    openModalStack.push(id);
    // Se guarda el disparador para devolverle el foco al cerrar: sin esto,
    // quien navega con teclado vuelve al inicio de la página.
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Primer campo del contenido (no la "X" del header); si no hay ninguno,
    // el diálogo mismo, para que el lector de pantalla anuncie el título.
    const firstField = bodyRef.current ? focusableIn(bodyRef.current)[0] : undefined;
    (firstField ?? dialog).focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog || openModalStack[openModalStack.length - 1] !== id) return;
      if (event.key === "Escape") {
        if (dismissibleRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = focusableIn(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !dialog.contains(active);
      if (event.shiftKey && (outside || active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const index = openModalStack.indexOf(id);
      if (index !== -1) openModalStack.splice(index, 1);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={dismissible ? onClose : undefined}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={cn("flex w-full flex-col rounded-lg border border-line bg-card p-6 shadow-lg outline-none", maxWidthClassName)}
        style={{ maxHeight: "min(85vh, 100%)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex flex-shrink-0 items-center justify-between gap-4">
          {title && (
            <h2 id={titleId} className="font-display text-lg font-semibold text-ink">
              {title}
            </h2>
          )}
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="ml-auto grid h-7 w-7 place-items-center rounded-md text-ink-soft transition-colors hover:bg-brand-tint hover:text-brand-strong"
            >
              <Icon name="close" size="md" />
            </button>
          )}
        </div>
        {/* Solo esta parte scrollea — el header (título + cerrar) queda fijo arriba.
            Antes el panel entero no tenía límite de alto: con contenido largo (ej.
            "Vista previa" de un campo con imágenes embebidas) la mitad quedaba
            arriba del viewport, sin scroll posible, y el botón de guardar era
            inalcanzable. */}
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
