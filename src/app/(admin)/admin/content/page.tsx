import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listStages } from "@/server/services/stage.service";
import { listContentByStage } from "@/server/services/content.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { CONTENT_TYPE_LABELS } from "@/lib/content-labels";
import { StageSelector } from "./StageSelector";
import { ContentForm } from "./ContentForm";
import { ContentActions } from "./ContentActions";

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
      <div>
        <PageHeader title="Contenido" />
        <EmptyState
          title="Todavía no hay etapas"
          description="Creá al menos una en Ruta de onboarding antes de agregar contenido."
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

  const items = await listContentByStage(identity, selectedStage._id);
  const roleOptions = roles.map((role) => ({ id: role._id.toString(), label: role.label }));
  const stageOptions = stages.map((stage) => ({ id: stage._id.toString(), title: stage.title }));

  return (
    <div>
      <PageHeader title="Contenido" description="Texto, video e imágenes por etapa — común o específico de un rol." />
      <StageSelector stages={stageOptions} selectedStageId={selectedStage._id.toString()} />

      <DataTable
        rows={items}
        rowKey={(item) => item._id.toString()}
        emptyMessage="Esta etapa todavía no tiene contenido."
        columns={[
          { header: "Orden", render: (item) => item.order },
          { header: "Título", render: (item) => item.title },
          { header: "Tipo", render: (item) => CONTENT_TYPE_LABELS[item.type] },
          {
            header: "Alcance",
            render: (item) =>
              item.scope === "COMMON"
                ? "Común"
                : item.roleIds.map((id) => roleOptions.find((r) => r.id === id.toString())?.label ?? "?").join(", "),
          },
          {
            header: "Estado",
            render: (item) => <Badge variant={item.status === "PUBLISHED" ? "success" : "neutral"}>{item.status}</Badge>,
          },
          {
            header: "Acciones",
            render: (item) => (
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
        ]}
      />

      <div className="mt-8">
        <ContentForm stageId={selectedStage._id.toString()} roles={roleOptions} />
      </div>
    </div>
  );
}
