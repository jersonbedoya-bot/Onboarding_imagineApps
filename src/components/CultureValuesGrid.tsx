"use client";

import { useState } from "react";
import { cultureValueIcon, type CultureValue } from "@/lib/institutional-content";
import { cn } from "@/lib/cn";

/**
 * Mini-cards clickeables para los 5 valores de "Quiénes Somos y Nuestra
 * Visión" (ver institutional-content.ts): arrancan colapsadas (ícono +
 * título) y se expanden al click/tap para revelar la descripción — mismo
 * mecanismo de "click para descubrir" que HistoryTimeline, para que Fase 01
 * se sienta como una sola experiencia y no como piezas sueltas.
 */
export function CultureValuesGrid({ values }: { values: CultureValue[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {values.map((value, i) => {
        const isOpen = openIndex === i;
        return (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(isOpen ? null : i)}
            aria-expanded={isOpen}
            className={cn(
              "rounded-lg border p-4 text-left shadow-sm transition-all duration-200",
              isOpen ? "border-brand bg-brand-tint" : "border-line bg-card hover:-translate-y-0.5 hover:border-brand-soft hover:shadow-md",
            )}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-xl leading-none">
                {cultureValueIcon(value.title)}
              </span>
              <h4 className="font-display text-base font-semibold text-ink">{value.title}</h4>
            </span>
            <p
              className={cn(
                "grid text-sm leading-relaxed text-ink-soft transition-[grid-template-rows,opacity,margin-top] duration-200",
                isOpen ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <span className="overflow-hidden">{value.description}</span>
            </p>
          </button>
        );
      })}
    </div>
  );
}
