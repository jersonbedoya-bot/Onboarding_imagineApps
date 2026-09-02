import Link from "next/link";
import { Icon } from "@/components/Icon";

export type BreadcrumbItem = { label: string; href?: string };

/**
 * Rastro de jerarquía (Módulos › Etapa › Proceso) — reemplaza el botón
 * suelto "← Volver a…" con algo que además ubica al admin dentro de la
 * estructura completa y permite saltar a cualquier nivel intermedio, no
 * solo al inmediatamente anterior.
 */
export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav
      aria-label="Ruta de navegación"
      className={`flex flex-wrap items-center gap-1.5 text-sm text-ink-soft ${className ?? ""}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <Icon name="chevron-right" size="sm" className="text-line" aria-hidden="true" />
            )}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-brand-strong hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-ink" : undefined}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
