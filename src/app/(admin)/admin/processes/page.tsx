import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listStages } from "@/server/services/stage.service";
import { listProcessesByStage } from "@/server/services/process.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { StageSelector } from "../content/StageSelector";
import { ProcessForm } from "./ProcessForm";
import { ProcessActions } from "./ProcessActions";

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe.
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
      <main>
        <h1>Procesos</h1>
        <p>
          Todavía no hay etapas. Creá al menos una en <a href="/admin/routes">Ruta de onboarding</a> antes de agregar
          procesos.
        </p>
      </main>
    );
  }

  const { stageId: requestedStageId } = await searchParams;
  const selectedStageId = requestedStageId ?? stages[0]._id.toString();
  const selectedStage = stages.find((stage) => stage._id.toString() === selectedStageId) ?? stages[0];

  const processes = await listProcessesByStage(identity, selectedStage._id);
  const roleOptions = roles.map((role) => ({ id: role._id.toString(), label: role.label }));
  const stageOptions = stages.map((stage) => ({ id: stage._id.toString(), title: stage.title }));

  return (
    <main>
      <h1>Procesos</h1>
      <StageSelector stages={stageOptions} selectedStageId={selectedStage._id.toString()} />

      <DataTable
        rows={processes}
        rowKey={(process) => process._id.toString()}
        emptyMessage="Esta etapa todavía no tiene procesos."
        columns={[
          { header: "Orden", render: (process) => process.order },
          {
            header: "Título",
            render: (process) => <Link href={`/admin/processes/${process._id.toString()}`}>{process.title}</Link>,
          },
          {
            header: "Alcance",
            render: (process) =>
              process.scope === "COMMON"
                ? "Común"
                : process.roleIds.map((id) => roleOptions.find((r) => r.id === id.toString())?.label ?? "?").join(", "),
          },
          { header: "Estado", render: (process) => process.status },
          {
            header: "Acciones",
            render: (process) => <ProcessActions id={process._id.toString()} status={process.status} />,
          },
        ]}
      />

      <ProcessForm stageId={selectedStage._id.toString()} roles={roleOptions} />
    </main>
  );
}
