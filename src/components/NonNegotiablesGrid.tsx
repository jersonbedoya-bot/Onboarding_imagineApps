import type { NonNegotiable } from "@/lib/institutional-content";

/** Grilla de cards para los principios no negociables de Fase 01 (ver institutional-content.ts). */
export function NonNegotiablesGrid({ items }: { items: NonNegotiable[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-line bg-card p-4 shadow-sm xl:p-5">
          <h4 className="mb-2 font-display text-base font-semibold text-brand-strong xl:text-lg">{item.title}</h4>
          <p className="text-sm leading-relaxed text-ink-soft">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
