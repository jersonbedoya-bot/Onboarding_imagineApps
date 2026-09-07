"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

export type ActionMenuItem = {
  label: string;
  onClick: () => void;
  /** Rojo, para la(s) acción(es) destructiva(s)/irreversible(s) — el único acento de color, y solo visible con el menú ya abierto. */
  danger?: boolean;
  disabled?: boolean;
};

/**
 * Menú "⋯" para agrupar varias acciones de una fila de tabla en un solo
 * control — pedido explícito del usuario: antes cada acción (cambiar nivel
 * de acceso, restablecer contraseña, reiniciar onboarding, desactivar,
 * borrar...) era un botón suelto, cada uno con su propio color, y una fila
 * con varias acciones se veía como un mosaico de piezas sueltas. Acá solo
 * el trigger (siempre el mismo, en cualquier fila) es visible de entrada;
 * los items destructivos se distinguen en rojo recién DENTRO del menú ya
 * abierto, no como ruido de color en la fila.
 *
 * `position: fixed` (no un portal de React) para el panel — mismo criterio
 * que Modal.tsx: fixed ya escapa el `overflow-x-auto` de DataTable sin
 * necesitar createPortal, mientras ningún ancestro tenga transform/filter
 * (no es el caso en este admin).
 */
export function ActionMenu({ items, label = "Más acciones" }: { items: ActionMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUpward: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    // No hay forma de medir el panel antes de pintarlo una vez — se estima
    // su alto a partir de la cantidad de items (40px c/u + padding), para
    // decidir si abre hacia abajo (caso normal) o hacia arriba (fila cerca
    // del borde inferior del viewport).
    const estimatedHeight = items.length * 40 + 12;
    const openUpward = rect.bottom + estimatedHeight > window.innerHeight;
    setCoords({ top: openUpward ? rect.top - 4 : rect.bottom + 4, left: rect.right, openUpward });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    // capture:true en "scroll" — ese evento no burbujea, pero sí se
    // dispara en fase de captura para cualquier ancestro (incluido el
    // contenedor overflow-x-auto de DataTable, o el scroll de la página).
    // Sin esto, la posición fixed queda pegada al viewport mientras la fila
    // se movió por debajo, y el menú termina apuntando a otra fila.
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", () => setOpen(false), true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", () => setOpen(false), true);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-card text-ink-soft transition-colors hover:border-brand hover:text-brand-strong"
      >
        <Icon name="more" size="md" />
      </button>

      {open && coords && (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            "fixed z-50 min-w-[13rem] -translate-x-full rounded-lg border border-line bg-card p-1.5 shadow-lg",
            coords.openUpward && "-translate-y-full",
          )}
          style={{ top: coords.top, left: coords.left }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={cn(
                "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                item.danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-brand-tint",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
