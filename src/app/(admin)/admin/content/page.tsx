import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listStages } from "@/server/services/stage.service";
import { listContentByStage } from "@/server/services/content.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { StageSelector } from "./StageSelector";
import { ContentForm } from "./ContentForm";
import { ContentActions } from "./ContentActions";

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe.
export default async function AdminContentPage({
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
        <h1>Contenido</h1>
        <p>
          Todavía no hay etapas. Creá al menos una en{" "}
          <a href="/admin/routes">Ruta de onboarding</a> antes de agregar contenido.
        </p>
      </main>
    );
  }

  const { stageId: requestedStageId } = await searchParams;
  const selectedStageId = requestedStageId ?? stages[0]._id.toString();
  const selectedStage = stages.find((stage) => stage._id.toString() === selectedStageId) ?? stages[0];

  const items = await listContentByStage(identity, selectedStage._id);
  const roleOptions = roles.map((role) => ({ id: role._id.toString(), label: role.label }));
  const stageOptions = stages.map((stage) => ({ id: stage._id.toString(), title: stage.title }));

  return (
    <main>
      <h1>Contenido</h1>
      <StageSelector stages={stageOptions} selectedStageId={selectedStage._id.toString()} />

      <DataTable
        rows={items}
        rowKey={(item) => item._id.toString()}
        emptyMessage="Esta etapa todavía no tiene contenido."
        columns={[
          { header: "Orden", render: (item) => item.order },
          { header: "Título", render: (item) => item.title },
          { header: "Tipo", render: (item) => item.type },
          {
            header: "Alcance",
            render: (item) =>
              item.scope === "COMMON"
                ? "Común"
                : item.roleIds
                    .map((roleId) => roleOptions.find((r) => r.id === roleId.toString())?.label ?? "?")
                    .join(", "),
          },
          { header: "Estado", render: (item) => item.status },
          {
            header: "Acciones",
            render: (item) => <ContentActions id={item._id.toString()} status={item.status} />,
          },
        ]}
      />

      <ContentForm stageId={selectedStage._id.toString()} roles={roleOptions} />
    </main>
  );
}
