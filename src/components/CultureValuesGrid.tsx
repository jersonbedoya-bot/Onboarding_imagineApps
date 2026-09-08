"use client";

import { useState } from "react";
import { valueIcon, type ValueItem } from "@/lib/content-display";
import { cn } from "@/lib/cn";

/**
 * Mini-cards clickeables para contenido `displayFormat: "VALUES_GRID"`
 * (hoy solo "Nuestra Visión", ver content-display.ts): arrancan colapsadas
 * (ícono + título) y se expanden al click/tap para revelar la descripción —
 * única excepción deliberada al resto de los grids (FACT_GRID/STEPS,
 * IconCardGrid), pensada para contenido de cultura/valores que se lee de a
 * uno con calma, no para escanear como referencia rápida.
 */
export function CultureValuesGrid({ values }: { values: ValueItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    // Flexbox con wrap en vez de columnas fijas (sm:grid-cols-2
    // xl:grid-cols-3): con Grid, una cantidad de valores que no es múltiplo
    // exacto de columnas deja la última fila pegada a la izquierda.
    // Flexbox centra cada fila envuelta de forma independiente (ver
    // feedback de usuario, mismo caso que IconCardGrid/LeadersBoard).
    <div className="flex flex-wrap justify-center gap-3">
      {values.map((value, i) => {
        const isOpen = openIndex === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(isOpen ? null : i)}
            aria-expanded={isOpen}
            className={cn(
              "w-full rounded-lg border p-4 text-left shadow-sm transition-all duration-200 sm:max-w-[340px] sm:flex-1 sm:basis-[260px]",
              isOpen ? "border-brand bg-brand-tint" : "border-line bg-card hover:-translate-y-0.5 hover:border-brand-soft hover:shadow-md",
            )}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-xl leading-none">
                {valueIcon(value.title)}
              </span>
              <h4 className="font-display text-base font-semibold text-ink">{value.title}</h4>
            </span>
            <p
              className={cn(
                "grid text-sm leading-relaxed text-ink-soft transition-[grid-template-rows,opacity,margin-top] duration-200",
                isOpen ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              {/* Mismo caso que IconCardGrid: el Markdown fuente es una sola
                  oración ("**Título:** descripción en minúscula"), pero acá
                  se separan visualmente en 2 líneas — se capitaliza solo al
                  mostrarla, sin tocar el texto guardado. */}
              <span className="overflow-hidden first-letter:uppercase">{value.description}</span>
            </p>
          </button>
        );
      })}
    </div>
  );
}
