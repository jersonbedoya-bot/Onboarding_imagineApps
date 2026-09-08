import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconCardItem = {
  icon: ReactNode;
  /** Opcional: los pasos numerados (STEPS) no llevan un título propio por ítem, solo el número como ícono + la instrucción como descripción (ver content-display.ts). */
  title?: string;
  /** Si el título viene de un link Markdown (`[label](url)`) en el body original, el href se guarda acá para no perder el link al mostrarlo como texto de tarjeta en vez de Markdown. */
  href?: string | null;
  /** Etiqueta corta opcional (ej. sector de un proyecto) — se muestra como pill junto al título. */
  badge?: string;
  description: string;
};

/**
 * Grid de tarjetas con ícono/badge + título opcional + descripción — el
 * componente de render para `displayFormat: "FACT_GRID"` y `"STEPS"` (ver
 * content-display.ts). Antes existían 3 copias casi idénticas de este JSX
 * (NonNegotiablesGrid, ImpactProjectsGrid, y una para herramientas) — ahora
 * es un solo componente presentacional (la resolución de íconos/parsing de
 * Markdown vive en content-display.ts, acá solo se dibuja lo que ya viene
 * resuelto).
 */
export function IconCardGrid({ items }: { items: IconCardItem[] }) {
  return (
    // Flexbox con wrap en vez de CSS Grid + auto-fit: Grid centra el bloque
    // de columnas COMPLETO (compartido por todas las filas) — al ensanchar
    // el contenedor, auto-fit arma tantas columnas que casi no queda
    // espacio sobrante para centrar, y una fila incompleta queda pegada a
    // la izquierda. Flexbox centra cada fila envuelta de forma
    // independiente, sin importar cuánto se ensanche el contenedor (ver
    // feedback de usuario).
    <div className="flex flex-wrap justify-center gap-4">
      {items.map((item, i) => (
        <div key={i} className="w-full rounded-lg border border-line bg-card p-4 shadow-sm sm:max-w-[340px] sm:flex-1 sm:basis-[260px] xl:p-5">
          <div className={cn("flex flex-wrap items-start justify-between gap-2", item.title && "mb-2")}>
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-xl leading-none">
                {item.icon}
              </span>
              {item.title && (
                <h4 className="font-display text-base font-semibold text-ink xl:text-lg">
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </h4>
              )}
            </span>
            {item.badge && <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand-strong">{item.badge}</span>}
          </div>
          {/* El Markdown fuente se escribe como una sola oración ("**Título:**
              descripción en minúscula", gramaticalmente correcto seguido de
              dos puntos) — pero acá título y descripción se separan en 2
              líneas, y la minúscula queda pegada abajo como si fuera un
              error (ver feedback de usuario). first-letter:uppercase la
              capitaliza solo al mostrarla, sin tocar el texto guardado. */}
          <p className="text-sm leading-relaxed text-ink-soft first-letter:uppercase">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
