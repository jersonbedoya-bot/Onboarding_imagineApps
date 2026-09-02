import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Antes había un solo aviso "Conocé a tu equipo" mezclando gerencia +
 * equipo de rol en un mismo conteo. Ahora se usa dos veces con foco
 * distinto — gerencia arriba del recorrido (aplica a todos por igual) y
 * equipo de rol dentro de Fase 04 (justo donde el usuario ya está leyendo
 * sobre su propio rol) — mismo componente, mismo trato visual.
 */
export function TeamTeaser({
  href,
  title,
  description,
  className,
}: {
  href: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-brand-soft bg-brand-tint px-5 py-4 transition-colors hover:border-brand",
        className,
      )}
    >
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-ink-soft">{description}</p>
      </div>
      <span className="flex-shrink-0 text-sm font-semibold text-brand-strong">Ver equipo →</span>
    </Link>
  );
}
