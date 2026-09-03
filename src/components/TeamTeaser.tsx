import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Card-aviso genérica: vive DENTRO de una fase pero linkea a una página
 * independiente — pensada para contenido que existe a propósito fuera del
 * recorrido secuencial y necesita visibilidad sin dejar de ser "siempre
 * accesible". Se usa hoy para "Conoce a tu equipo" (dentro de la fase de
 * rol) — genérico a propósito por si aparece un segundo caso de uso.
 */
export function TeamTeaser({
  href,
  title,
  description,
  cta = "Ver equipo →",
  className,
}: {
  href: string;
  title: string;
  description: string;
  cta?: string;
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
      <span className="flex-shrink-0 text-sm font-semibold text-brand-strong">{cta}</span>
    </Link>
  );
}
