import { nonNegotiableIcon, type NonNegotiable } from "@/lib/institutional-content";

/** Grilla de cards para los principios no negociables de Fase 01 (ver institutional-content.ts). */
export function NonNegotiablesGrid({ items }: { items: NonNegotiable[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(260px,340px))] sm:justify-center">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-line bg-card p-4 shadow-sm xl:p-5">
          <div className="mb-2 flex items-center gap-2">
            <span aria-hidden className="text-xl leading-none">
              {nonNegotiableIcon(item.title)}
            </span>
            <h4 className="font-display text-base font-semibold text-brand-strong xl:text-lg">{item.title}</h4>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
