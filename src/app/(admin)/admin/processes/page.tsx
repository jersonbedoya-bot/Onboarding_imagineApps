import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listStages } from "@/server/services/stage.service";
import { listProcessesByStage } from "@/server/services/process.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { StageSelector } from "../content/StageSelector";
import { ProcessForm } from "./ProcessForm";
import { ProcessActions } from "./ProcessActions";

export default async function AdminProcessesPage({
  searchParams,
}: {
  searchParams: Promise<{ stageId?: string }>;
}) {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const [stages, roles] = await Promise.all([listStages(identity), roleRepository.listByTenant(identity.tenantId)]);

  if (stages.length === 0) {
    return (
      <div>
        <PageHeader title="Procesos" />
        <EmptyState
          title="Todavía no hay etapas"
          description="Creá al menos una en Ruta de onboarding antes de agregar procesos."
          action={
            <a href="/admin/routes" className="text-sm font-semibold text-brand-strong hover:underline">
              Ir a Ruta de onboarding →
            </a>
          }
        />
      </div>
    );
  }

  const { stageId: requestedStageId } = await searchParams;
  const selectedStageId = requestedStageId ?? stages[0]._id.toString();
  const selectedStage = stages.find((stage) => stage._id.toString() === selectedStageId) ?? stages[0];

  const processes = await listProcessesByStage(identity, selectedStage._id);
  const roleOptions = roles.map((role) => ({ id: role._id.toString(), label: role.label }));
  const stageOptions = stages.map((stage) => ({ id: stage._id.toString(), title: stage.title }));

  return (
    <div>
      <PageHeader title="Procesos" description="Guías paso a paso por etapa — común o específico de un rol." />
      <StageSelector stages={stageOptions} selectedStageId={selectedStage._id.toString()} />

      <DataTable
        rows={processes}
        rowKey={(process) => process._id.toString()}
        emptyMessage="Esta etapa todavía no tiene procesos."
        columns={[
          { header: "Orden", render: (process) => process.order },
          {
            header: "Título",
            render: (process) => (
              <Link href={`/admin/processes/${process._id.toString()}`} className="font-medium text-brand-strong hover:underline">
                {process.title}
              </Link>
            ),
          },
          {
            header: "Alcance",
            render: (process) =>
              process.scope === "COMMON"
                ? "Común"
                : process.roleIds.map((id) => roleOptions.find((r) => r.id === id.toString())?.label ?? "?").join(", "),
          },
          {
            header: "Estado",
            render: (process) => <Badge variant={process.status === "PUBLISHED" ? "success" : "neutral"}>{process.status}</Badge>,
          },
          {
            header: "Acciones",
            render: (process) => (
              <ProcessActions
                item={{
                  id: process._id.toString(),
                  stageId: process.stageId.toString(),
                  status: process.status,
                  title: process.title,
                  objective: process.objective,
                  context: process.context,
                  expectedResult: process.expectedResult,
                  scope: process.scope,
                  roleIds: process.roleIds.map((id) => id.toString()),
                }}
                roles={roleOptions}
              />
            ),
          },
        ]}
      />

      <div className="mt-8">
        <ProcessForm stageId={selectedStage._id.toString()} roles={roleOptions} />
      </div>
    </div>
  );
}
