import { Badge } from "@/components/Badge";

export type ModuleSummaryCounts = { draft: number; published: number; archived: number };

/**
 * Resumen rápido de cuánto contenido/procesos tiene un módulo y en qué
 * estado — para que un admin no técnico vea de un vistazo qué le falta
 * publicar, sin entrar a cada módulo. Solo cuenta activos (DRAFT+PUBLISHED);
 * los archivados se ven en su propio contador dentro de "Ver archivados"
 * (ArchivedSection), no se repiten acá.
 */
export function ModuleSummaryBadge({ label, counts }: { label: string; counts: ModuleSummaryCounts }) {
  const total = counts.draft + counts.published;

  if (total === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
        <span className="font-semibold text-ink">{label}:</span> ninguno todavía
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
      <span className="font-semibold text-ink">{label}:</span>
      {counts.published > 0 && <Badge variant="success">{counts.published} publicado{counts.published === 1 ? "" : "s"}</Badge>}
      {counts.draft > 0 && <Badge variant="neutral">{counts.draft} borrador{counts.draft === 1 ? "" : "es"}</Badge>}
    </span>
  );
}

/** Reduce una lista con `status` a los 3 contadores que espera ModuleSummaryBadge. */
export function countByStatus(items: { status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }[]): ModuleSummaryCounts {
  return items.reduce(
    (acc, item) => {
      if (item.status === "DRAFT") acc.draft += 1;
      else if (item.status === "PUBLISHED") acc.published += 1;
      else acc.archived += 1;
      return acc;
    },
    { draft: 0, published: 0, archived: 0 },
  );
}
