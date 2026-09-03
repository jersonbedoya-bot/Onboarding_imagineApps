import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { listStepsByProcess } from "@/server/services/step.service";
import * as processRepository from "@/server/repositories/process.repository";
import * as stageRepository from "@/server/repositories/stage.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { ArchivedSection } from "@/components/admin/ArchivedSection";
import { Breadcrumb } from "@/components/admin/Breadcrumb";
import { CONTENT_STATUS_LABELS } from "@/lib/status-labels";
import { ProcessActions } from "@/components/admin/ProcessActions";
import { ReorderableDataTable } from "@/components/admin/ReorderableDataTable";
import { StepForm } from "./StepForm";
import { StepActions } from "./StepActions";

export default async function AdminProcessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) notFound();

  const process = await processRepository.findById(identity.tenantId, new ObjectId(id));
  if (!process) notFound();

  // Tenant-scoped, igual que la propia etapa del proceso — solo hace falta
  // el título para la miga de pan, ya se resuelve el resto del módulo desde
  // /admin/modules/[stageId] al navegar ahí.
  const [steps, roles, stage] = await Promise.all([
    listStepsByProcess(identity, process._id),
    roleRepository.listByTenant(identity.tenantId),
    stageRepository.findById(identity.tenantId, process.stageId),
  ]);
  const roleOptions = roles.map((role) => ({ id: role._id.toString(), label: role.label }));

  const activeSteps = steps.filter((step) => step.status !== "ARCHIVED");
  const archivedSteps = steps.filter((step) => step.status === "ARCHIVED");

  function buildStepColumns() {
    return [
      { header: "Orden", render: (step: (typeof steps)[number]) => step.order },
      { header: "Título", render: (step: (typeof steps)[number]) => step.title },
      { header: "Video", render: (step: (typeof steps)[number]) => (step.videoUrl ? step.videoProvider : "—") },
      {
        header: "Estado",
        render: (step: (typeof steps)[number]) => (
          <Badge variant={step.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[step.status]}</Badge>
        ),
      },
      {
        header: "Acciones",
        render: (step: (typeof steps)[number]) => (
          <StepActions
            item={{
              id: step._id.toString(),
              processId: step.processId.toString(),
              status: step.status,
              title: step.title,
              description: step.description,
              instruction: step.instruction,
              videoUrl: step.videoUrl,
              completionCriteria: step.completionCriteria,
            }}
          />
        ),
      },
    ];
  }
  const stepColumns = buildStepColumns();
  // Celdas ya renderizadas en el servidor — ReorderableDataTable es un
  // Client Component, no puede recibir los documentos de Mongo (ObjectId)
  // ni las funciones `render` cruzando ese límite, solo JSX ya resuelto.
  const stepRows = activeSteps.map((step) => ({
    id: step._id.toString(),
    order: step.order,
    cells: stepColumns.map((column) => column.render(step)),
  }));

  return (
    <div>
      <Breadcrumb
        className="mb-3"
        items={[
          { label: "Módulos", href: "/admin/modules" },
          stage
            ? { label: stage.title, href: `/admin/modules/${stage._id.toString()}` }
            : { label: "Módulo", href: `/admin/modules/${process.stageId.toString()}` },
          { label: process.title },
        ]}
      />
      <PageHeader
        title={process.title}
        description={process.objective || undefined}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={process.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[process.status]}</Badge>
            <ProcessActions
              item={{
                id: process._id.toString(),
                stageId: process.stageId.toString(),
                status: process.status,
                title: process.title,
                objective: process.objective,
                context: process.context,
                expectedResult: process.expectedResult,
                resources: process.resources,
                scope: process.scope,
                roleIds: process.roleIds.map((rid) => rid.toString()),
              }}
              roles={roleOptions}
              showViewSteps={false}
            />
          </div>
        }
      />

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Pasos</h2>
      <ReorderableDataTable
        headers={stepColumns.map((column) => column.header)}
        rows={stepRows}
        emptyMessage="Este proceso todavía no tiene pasos."
        basePath="/api/steps"
      />
      <ArchivedSection count={archivedSteps.length}>
        <DataTable rows={archivedSteps} rowKey={(step) => step._id.toString()} emptyMessage="Sin pasos archivados." columns={stepColumns} />
      </ArchivedSection>

      <div className="mt-8">
        <StepForm processId={process._id.toString()} variant="modal" modalTitle={`Nuevo paso en "${process.title}"`} />
      </div>
    </div>
  );
}
