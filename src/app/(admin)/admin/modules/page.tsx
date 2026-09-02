import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { ensureRoute } from "@/server/services/route.service";
import { listStages } from "@/server/services/stage.service";
import { listContentByStage } from "@/server/services/content.service";
import { listProcessesByStage } from "@/server/services/process.service";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { countByStatus, type ModuleSummaryCounts } from "@/components/ModuleSummaryBadge";
import { ArchivedSection } from "@/components/admin/ArchivedSection";
import { ModuleCard } from "@/components/admin/ModuleCard";
import { CONTENT_STATUS_LABELS } from "@/lib/status-labels";
import { RouteActions } from "@/components/admin/RouteActions";
import { StageForm } from "@/components/admin/StageForm";

// Lista de módulos (etapas) — reemplaza a /admin/routes, /admin/content y
// /admin/processes como punto de entrada: desde acá se entra al módulo
// completo en vez de elegir la etapa por separado en 2 pantallas sin
// estado compartido. Cards en vez de tabla: "Depende de"/"Bloqueante" son
// configuración avanzada que casi no se toca día a día — quedan solo en el
// modal de edición, no como columnas permanentes (menos densidad visual
// para un admin no técnico).
export default async function AdminModulesPage() {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const [route, stages] = await Promise.all([ensureRoute(identity), listStages(identity)]);
  const stageOptions = stages.map((stage) => ({ id: stage._id.toString(), title: stage.title }));

  // Conteo de contenido/procesos por etapa — sin servicio nuevo, se reutilizan
  // los list* existentes y se reduce acá mismo (son pocas etapas, no amerita
  // un endpoint agregado).
  const summaries = await Promise.all(
    stages.map(async (stage) => {
      const [content, processes] = await Promise.all([
        listContentByStage(identity, stage._id),
        listProcessesByStage(identity, stage._id),
      ]);
      return { stageId: stage._id.toString(), content: countByStatus(content), processes: countByStatus(processes) };
    }),
  );
  const summaryByStageId = new Map(summaries.map((summary) => [summary.stageId, summary]));
  const emptySummary: ModuleSummaryCounts = { draft: 0, published: 0, archived: 0 };

  const activeStages = stages.filter((stage) => stage.status !== "ARCHIVED");
  const archivedStages = stages.filter((stage) => stage.status === "ARCHIVED");

  function renderCard(stage: (typeof stages)[number]) {
    const summary = summaryByStageId.get(stage._id.toString());
    return (
      <ModuleCard
        key={stage._id.toString()}
        stage={{
          id: stage._id.toString(),
          title: stage.title,
          order: stage.order,
          dependsOnStageId: stage.dependsOnStageId?.toString() ?? "",
          isBlocking: stage.isBlocking,
          status: stage.status,
        }}
        allStages={stageOptions}
        viewHref={`/admin/modules/${stage._id.toString()}`}
        content={summary?.content ?? emptySummary}
        processes={summary?.processes ?? emptySummary}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Módulos"
        description="Cada módulo agrupa su contenido y sus procesos en un solo lugar."
        action={
          <div className="flex items-center gap-3">
            <Badge variant={route.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[route.status]}</Badge>
            <RouteActions status={route.status} />
          </div>
        }
      />

      {activeStages.length === 0 ? (
        <p className="text-sm text-ink-soft">Todavía no hay módulos.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{activeStages.map(renderCard)}</div>
      )}

      <ArchivedSection count={archivedStages.length}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{archivedStages.map(renderCard)}</div>
      </ArchivedSection>

      <div className="mt-8">
        <StageForm existingStages={stageOptions} variant="modal" />
      </div>
    </div>
  );
}
