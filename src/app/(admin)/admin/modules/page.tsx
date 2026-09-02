import { redirect } from "next/navigation";
import type { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { ensureRoute, getRouteHeader } from "@/server/services/route.service";
import { listStages } from "@/server/services/stage.service";
import { listContentByStage } from "@/server/services/content.service";
import { listProcessesByStage } from "@/server/services/process.service";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { ModuleSummaryBadge, countByStatus, type ModuleSummaryCounts } from "@/components/ModuleSummaryBadge";
import { ArchivedSection } from "@/components/admin/ArchivedSection";
import { CONTENT_STATUS_LABELS } from "@/lib/status-labels";
import { RouteActions } from "@/components/admin/RouteActions";
import { RouteContentForm } from "@/components/admin/RouteContentForm";
import { StageActions } from "@/components/admin/StageActions";
import { StageForm } from "@/components/admin/StageForm";

type StageRow = {
  _id: ObjectId;
  title: string;
  order: number;
  dependsOnStageId: ObjectId | null;
  isBlocking: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

// Lista de módulos (etapas) — reemplaza a /admin/routes, /admin/content y
// /admin/processes como punto de entrada: desde acá se entra al módulo
// completo en vez de elegir la etapa por separado en 2 pantallas sin
// estado compartido.
export default async function AdminModulesPage() {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const [route, routeHeader, stages] = await Promise.all([ensureRoute(identity), getRouteHeader(identity.tenantId), listStages(identity)]);
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

  const columns: DataTableColumn<StageRow>[] = [
    { header: "Orden", render: (stage) => stage.order },
    { header: "Módulo", render: (stage) => <span className="font-medium text-ink">{stage.title}</span> },
    {
      header: "Depende de",
      render: (stage) => stageOptions.find((option) => option.id === stage.dependsOnStageId?.toString())?.title ?? "—",
    },
    { header: "Bloqueante", render: (stage) => (stage.isBlocking ? "Sí" : "No") },
    {
      header: "Contenido",
      render: (stage) => {
        const summary = summaryByStageId.get(stage._id.toString());
        return (
          <div className="flex flex-col gap-1">
            <ModuleSummaryBadge label="Contenido" counts={summary?.content ?? emptySummary} />
            <ModuleSummaryBadge label="Procesos" counts={summary?.processes ?? emptySummary} />
          </div>
        );
      },
    },
    {
      header: "Estado",
      render: (stage) => (
        <Badge variant={stage.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[stage.status]}</Badge>
      ),
    },
    {
      header: "Acciones",
      render: (stage) => (
        <StageActions
          item={{
            id: stage._id.toString(),
            title: stage.title,
            order: stage.order,
            dependsOnStageId: stage.dependsOnStageId?.toString() ?? "",
            isBlocking: stage.isBlocking,
            status: stage.status,
          }}
          allStages={stageOptions}
          viewHref={`/admin/modules/${stage._id.toString()}`}
        />
      ),
    },
  ];

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

      <div className="mb-8">
        <RouteContentForm headline={routeHeader.headline} subtitle={routeHeader.subtitle} />
      </div>

      <DataTable rows={activeStages} rowKey={(stage) => stage._id.toString()} emptyMessage="Todavía no hay módulos." columns={columns} />

      <ArchivedSection count={archivedStages.length}>
        <DataTable rows={archivedStages} rowKey={(stage) => stage._id.toString()} emptyMessage="No hay módulos archivados." columns={columns} />
      </ArchivedSection>

      <div className="mt-8">
        <StageForm existingStages={stageOptions} variant="modal" />
      </div>
    </div>
  );
}
