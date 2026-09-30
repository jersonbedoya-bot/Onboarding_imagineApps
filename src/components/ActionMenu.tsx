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
// Items habilitados del panel, en orden — lo que recorren las flechas.
function enabledItems(menu: HTMLElement | null): HTMLButtonElement[] {
  return Array.from(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])') ?? []);
}

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

  // Al abrir, el foco pasa al primer item (patrón de menú de WAI-ARIA): así
  // se puede elegir una acción solo con teclado, sin tabular por la tabla.
  useEffect(() => {
    if (open && coords) enabledItems(menuRef.current)[0]?.focus();
  }, [open, coords]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Devuelve el foco al "⋯": si no, quien usa teclado queda perdido
        // en el inicio de la página al desaparecer el menú.
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      // Tab sale del menú (sus items no están en el orden de tabulación):
      // se cierra para no dejarlo abierto apuntando a una fila sin foco.
      if (event.key === "Tab") {
        setOpen(false);
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
      const enabled = enabledItems(menuRef.current);
      if (enabled.length === 0) return;
      event.preventDefault();
      const current = enabled.indexOf(document.activeElement as HTMLButtonElement);
      let next: number;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = enabled.length - 1;
      else if (event.key === "ArrowDown") next = current === -1 ? 0 : (current + 1) % enabled.length;
      else next = current === -1 ? enabled.length - 1 : (current - 1 + enabled.length) % enabled.length;
      enabled[next].focus();
    }
    // capture:true en "scroll" — ese evento no burbujea, pero sí se
    // dispara en fase de captura para cualquier ancestro (incluido el
    // contenedor overflow-x-auto de DataTable, o el scroll de la página).
    // Sin esto, la posición fixed queda pegada al viewport mientras la fila
    // se movió por debajo, y el menú termina apuntando a otra fila.
    // Misma referencia en add/remove: con dos flechas distintas el listener
    // nunca se quitaba y se acumulaba uno por cada apertura.
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
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
          {items.map((item, i) => {
            // Separador antes del primer item "danger" — agrupa visualmente
            // lo reversible (cambiar rol, restablecer contraseña) de lo
            // irreversible (desactivar, borrar), sin depender solo del color.
            const isFirstDanger = item.danger && !items[i - 1]?.danger;
            return (
              <div key={i}>
                {isFirstDanger && <div role="separator" className="my-1 border-t border-line" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  tabIndex={-1}
                  onClick={() => {
                    setOpen(false);
                    // Foco al "⋯" ANTES de la acción: si abre un Modal, este
                    // toma como disparador al "⋯" (el item desaparece al
                    // cerrarse el menú) y le devuelve el foco al cerrar.
                    triggerRef.current?.focus();
                    item.onClick();
                  }}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                    item.danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-brand-tint",
                  )}
                >
                  {item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
