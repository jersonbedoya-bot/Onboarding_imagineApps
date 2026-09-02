import type { TimelineItem } from "@/lib/institutional-content";

/** Línea de tiempo vertical para los hitos institucionales de Fase 01 (ver institutional-content.ts). */
export function HistoryTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="flex flex-col gap-6 border-l-2 border-brand-soft pl-6">
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[1.72rem] top-1 h-3 w-3 rounded-full border-2 border-brand bg-card" />
          <span className="text-xs font-bold uppercase tracking-wide text-brand">{item.year}</span>
          <p className="mt-0.5 font-display text-base font-semibold text-ink">{item.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.description}</p>
        </li>
      ))}
    </ol>
  );
}
