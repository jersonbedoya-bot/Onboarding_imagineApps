import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { ModuleSummaryBadge, type ModuleSummaryCounts } from "@/components/ModuleSummaryBadge";
import { CONTENT_STATUS_LABELS } from "@/lib/status-labels";
import { StageActions, type StageActionItem } from "@/components/admin/StageActions";

type StageOption = { id: string; title: string };

/**
 * Un módulo (etapa) como card en /admin/modules — reemplaza la fila de
 * DataTable. "Depende de"/"Bloqueante" quedan fuera de la vista (son
 * configuración avanzada, poco usada día a día) y solo son editables desde
 * el modal de StageActions ("Editar"), no columnas permanentes.
 */
export function ModuleCard({
  stage,
  allStages,
  viewHref,
  content,
  processes,
}: {
  stage: StageActionItem;
  allStages: StageOption[];
  viewHref: string;
  content: ModuleSummaryCounts;
  processes: ModuleSummaryCounts;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold text-ink-soft">Módulo {stage.order}</span>
          <h3 className="font-display text-lg font-semibold text-ink">{stage.title}</h3>
        </div>
        <Badge variant={stage.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[stage.status]}</Badge>
      </div>

      <div className="flex flex-col gap-1.5">
        <ModuleSummaryBadge label="Contenido" counts={content} />
        <ModuleSummaryBadge label="Procesos" counts={processes} />
      </div>

      <StageActions item={stage} allStages={allStages} viewHref={viewHref} variant="card" />
    </Card>
  );
}
