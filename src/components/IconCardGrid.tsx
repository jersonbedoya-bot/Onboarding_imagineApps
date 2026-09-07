import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type IconCardItem = {
  icon: ReactNode;
  /** Opcional: los pasos numerados de Timeboxing no llevan un título propio por ítem, solo el número como ícono + la instrucción como descripción (ver daily-life-content.ts). */
  title?: string;
  /** Si el título viene de un link Markdown (`[label](url)`) en el body original, el href se guarda acá para no perder el link al mostrarlo como texto de tarjeta en vez de Markdown. */
  href?: string | null;
  description: string;
};

/**
 * Grid de tarjetas con ícono/badge + título opcional + descripción — layout
 * compartido por NonNegotiablesGrid y los content items de "Reglas y
 * Herramientas" (ver daily-life-content.ts): antes cada uno tenía su propia
 * copia casi idéntica de este JSX, ahora es un solo componente presentacional
 * (la resolución de íconos/parsing de Markdown sigue viviendo en cada lib
 * específica, acá solo se dibuja lo que ya viene resuelto).
 */
export function IconCardGrid({ items }: { items: IconCardItem[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(260px,340px))] sm:justify-center">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-line bg-card p-4 shadow-sm xl:p-5">
          <div className={cn("flex items-center gap-2", item.title && "mb-2")}>
            <span aria-hidden className="text-xl leading-none">
              {item.icon}
            </span>
            {item.title && (
              <h4 className="font-display text-base font-semibold text-brand-strong xl:text-lg">
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
              </h4>
            )}
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{item.description}</p>
        </div>
      ))}
    </div>
  );
}
