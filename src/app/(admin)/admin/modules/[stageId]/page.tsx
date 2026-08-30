import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { listStages } from "@/server/services/stage.service";
import * as stageRepository from "@/server/repositories/stage.repository";
import { listContentByStage } from "@/server/services/content.service";
import { listProcessesByStage } from "@/server/services/process.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { LinkButton } from "@/components/Button";
import { ModuleSummaryBadge, countByStatus } from "@/components/ModuleSummaryBadge";
import { ArchivedSection } from "@/components/admin/ArchivedSection";
import { CONTENT_TYPE_LABELS } from "@/lib/content-labels";
import { CONTENT_STATUS_LABELS } from "@/lib/status-labels";
import { StageActions } from "@/components/admin/StageActions";
import { ContentForm } from "@/components/admin/ContentForm";
import { ContentActions } from "@/components/admin/ContentActions";
import { ProcessForm } from "@/components/admin/ProcessForm";
import { ProcessActions } from "@/components/admin/ProcessActions";

export default async function AdminModuleDetailPage({ params }: { params: Promise<{ stageId: string }> }) {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const { stageId } = await params;
  if (!ObjectId.isValid(stageId)) notFound();

  // Tenant-scoped: una etapa de otro tenant o inexistente da lo mismo
  // (nunca se distingue "no es tuya" de "no existe" — ver convención en
  // CLAUDE.md).
  const stage = await stageRepository.findById(identity.tenantId, new ObjectId(stageId));
  if (!stage) notFound();

  const [allStages, content, processes, roles] = await Promise.all([
    listStages(identity),
    listContentByStage(identity, stage._id),
    listProcessesByStage(identity, stage._id),
    roleRepository.listByTenant(identity.tenantId),
  ]);

  const stageOptions = allStages.map((s) => ({ id: s._id.toString(), title: s.title }));
  const roleOptions = roles.map((role) => ({ id: role._id.toString(), label: role.label }));

  // allStages ya viene ordenado por `order` (stageRepository.listByRoute) —
  // se reutiliza tal cual para saber cuál es el módulo anterior/siguiente,
  // sin una query aparte.
  const currentIndex = allStages.findIndex((s) => s._id.equals(stage._id));
  const prevStage = currentIndex > 0 ? allStages[currentIndex - 1] : null;
  const nextStage = currentIndex >= 0 && currentIndex < allStages.length - 1 ? allStages[currentIndex + 1] : null;

  const activeContent = content.filter((item) => item.status !== "ARCHIVED");
  const archivedContent = content.filter((item) => item.status === "ARCHIVED");
  const activeProcesses = processes.filter((item) => item.status !== "ARCHIVED");
  const archivedProcesses = processes.filter((item) => item.status === "ARCHIVED");

  const contentColumns = [
    { header: "Orden", render: (item: (typeof content)[number]) => item.order },
    { header: "Título", render: (item: (typeof content)[number]) => item.title },
    { header: "Tipo", render: (item: (typeof content)[number]) => CONTENT_TYPE_LABELS[item.type] },
    {
      header: "Alcance",
      render: (item: (typeof content)[number]) =>
        item.scope === "COMMON" ? "Común" : item.roleIds.map((id) => roleOptions.find((r) => r.id === id.toString())?.label ?? "?").join(", "),
    },
    {
      header: "Estado",
      render: (item: (typeof content)[number]) => (
        <Badge variant={item.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[item.status]}</Badge>
      ),
    },
    {
      header: "Acciones",
      render: (item: (typeof content)[number]) => (
        <ContentActions
          item={{
            id: item._id.toString(),
            stageId: item.stageId.toString(),
            status: item.status,
            title: item.title,
            body: item.body,
            type: item.type,
            mediaId: item.mediaId ? item.mediaId.toString() : null,
            videoUrl: item.videoUrl,
            scope: item.scope,
            roleIds: item.roleIds.map((id) => id.toString()),
            requirement: item.requirement,
          }}
          roles={roleOptions}
        />
      ),
    },
  ];

  const processColumns = [
    { header: "Orden", render: (item: (typeof processes)[number]) => item.order },
    { header: "Título", render: (item: (typeof processes)[number]) => item.title },
    {
      header: "Alcance",
      render: (item: (typeof processes)[number]) =>
        item.scope === "COMMON" ? "Común" : item.roleIds.map((id) => roleOptions.find((r) => r.id === id.toString())?.label ?? "?").join(", "),
    },
    {
      header: "Estado",
      render: (item: (typeof processes)[number]) => (
        <Badge variant={item.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[item.status]}</Badge>
      ),
    },
    {
      header: "Acciones",
      render: (item: (typeof processes)[number]) => (
        <ProcessActions
          item={{
            id: item._id.toString(),
            stageId: item.stageId.toString(),
            status: item.status,
            title: item.title,
            objective: item.objective,
            context: item.context,
            expectedResult: item.expectedResult,
            scope: item.scope,
            roleIds: item.roleIds.map((id) => id.toString()),
          }}
          roles={roleOptions}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <LinkButton href="/admin/modules" variant="ghost" className="px-3 py-1.5 text-xs">
          ← Volver a Módulos
        </LinkButton>
        <div className="flex flex-wrap items-center gap-2">
          {prevStage && (
            <LinkButton href={`/admin/modules/${prevStage._id.toString()}`} variant="secondary" className="px-3 py-1.5 text-xs">
              ← {prevStage.title}
            </LinkButton>
          )}
          {nextStage && (
            <LinkButton href={`/admin/modules/${nextStage._id.toString()}`} variant="secondary" className="px-3 py-1.5 text-xs">
              {nextStage.title} →
            </LinkButton>
          )}
        </div>
      </div>
      <PageHeader
        title={stage.title}
        description="Contenido y procesos de este módulo, todo en un solo lugar."
        action={
          <div className="flex items-center gap-3">
            <Badge variant={stage.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[stage.status]}</Badge>
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
            />
          </div>
        }
      />

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Contenido</h2>
          <ModuleSummaryBadge label="Total" counts={countByStatus(content)} />
        </div>
        <DataTable rows={activeContent} rowKey={(item) => item._id.toString()} emptyMessage="Este módulo todavía no tiene contenido." columns={contentColumns} />
        <ArchivedSection count={archivedContent.length}>
          <DataTable rows={archivedContent} rowKey={(item) => item._id.toString()} emptyMessage="Sin contenido archivado." columns={contentColumns} />
        </ArchivedSection>
        <div className="mt-6">
          <ContentForm stageId={stage._id.toString()} roles={roleOptions} variant="modal" modalTitle={`Nuevo contenido en "${stage.title}"`} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Procesos</h2>
          <ModuleSummaryBadge label="Total" counts={countByStatus(processes)} />
        </div>
        <DataTable rows={activeProcesses} rowKey={(item) => item._id.toString()} emptyMessage="Este módulo todavía no tiene procesos." columns={processColumns} />
        <ArchivedSection count={archivedProcesses.length}>
          <DataTable rows={archivedProcesses} rowKey={(item) => item._id.toString()} emptyMessage="Sin procesos archivados." columns={processColumns} />
        </ArchivedSection>
        <div className="mt-6">
          <ProcessForm stageId={stage._id.toString()} roles={roleOptions} variant="modal" modalTitle={`Nuevo proceso en "${stage.title}"`} />
        </div>
      </section>
    </div>
  );
}
