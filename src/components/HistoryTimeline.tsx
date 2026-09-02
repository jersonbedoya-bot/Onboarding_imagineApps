"use client";

import { useState } from "react";
import type { TimelineItem } from "@/lib/institutional-content";
import { cn } from "@/lib/cn";

/**
 * Línea de tiempo vertical para los hitos institucionales de Fase 01 (ver
 * institutional-content.ts). Cada hito arranca colapsado (año + título) y
 * se expande al click/tap para revelar la descripción — mismo mecanismo de
 * "click para descubrir" que CultureValuesGrid.
 */
export function HistoryTimeline({ items }: { items: TimelineItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <ol className="flex flex-col gap-6 border-l-2 border-brand-soft pl-6">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <li key={i} className="relative">
            <span className="absolute -left-[1.72rem] top-1 h-3 w-3 rounded-full border-2 border-brand bg-card" />
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="group flex w-full items-baseline gap-2 text-left"
            >
              <span className="text-xs font-bold uppercase tracking-wide text-brand">{item.year}</span>
              <span className="font-display text-base font-semibold text-ink">{item.title}</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className={cn(
                  "ml-auto h-4 w-4 flex-none text-ink-soft transition-transform duration-200 group-hover:text-brand",
                  isOpen && "rotate-180",
                )}
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p
              className={cn(
                "grid text-sm leading-relaxed text-ink-soft transition-[grid-template-rows,opacity,margin-top] duration-200",
                isOpen ? "mt-1 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <span className="overflow-hidden">{item.description}</span>
            </p>
          </li>
        );
      })}
    </ol>
  );
}
