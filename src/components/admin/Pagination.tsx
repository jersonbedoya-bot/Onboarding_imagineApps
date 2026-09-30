import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/Icon";

/**
 * Antes /admin/audit y /admin/quiz-answers solo mostraban "Página X de Y" en
 * texto plano — para ver la página siguiente había que editar `?page=` a
 * mano en la URL, algo que ni siquiera un admin técnico hace por costumbre.
 * Server Component puro (Link, no botones con onClick): estas páginas ya
 * son Server Components que leen `page` de `searchParams`, así que no hace
 * falta Client Component solo para cambiar de página.
 */
export function Pagination({
  basePath,
  page,
  totalPages,
  total,
  itemLabel,
  searchParams,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  /** "eventos", "respuestas"... para el texto "N eventos" al final. */
  itemLabel: string;
  /** Filtros actuales (sin `page`) — se preservan al cambiar de página. */
  searchParams: Record<string, string | undefined>;
}) {
  function hrefFor(targetPage: number): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) query.set(key, value);
    }
    query.set("page", String(targetPage));
    return `${basePath}?${query.toString()}`;
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <p className="text-xs text-ink-soft">
        Página {page} de {totalPages} ({total} {itemLabel})
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={hrefFor(page - 1)} disabled={page <= 1} label="Página anterior">
          <Icon name="chevron-left" size="sm" />
          Anterior
        </PageLink>
        <PageLink href={hrefFor(page + 1)} disabled={page >= totalPages} label="Página siguiente">
          Siguiente
          <Icon name="chevron-right" size="sm" />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  const classes = cn(
    "inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors",
    disabled ? "cursor-not-allowed text-ink-soft/40" : "text-ink-soft hover:border-brand hover:text-brand-strong",
  );

  if (disabled) {
    return (
      <span aria-disabled="true" aria-label={label} className={classes}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={classes}>
      {children}
    </Link>
  );
}
