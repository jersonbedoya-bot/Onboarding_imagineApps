import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { ensureRoute } from "@/server/services/route.service";
import { listStages } from "@/server/services/stage.service";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { RouteActions } from "./RouteActions";
import { StageActions } from "./StageActions";
import { StageForm } from "./StageForm";

export default async function AdminRoutesPage() {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const [route, stages] = await Promise.all([ensureRoute(identity), listStages(identity)]);

  const stageOptions = stages.map((stage) => ({ id: stage._id.toString(), title: stage.title }));

  return (
    <div>
      <PageHeader
        title="Ruta de onboarding"
        description="La secuencia de etapas que recorre cada usuario."
        action={
          <div className="flex items-center gap-3">
            <Badge variant={route.status === "PUBLISHED" ? "success" : "neutral"}>{route.status}</Badge>
            <RouteActions status={route.status} />
          </div>
        }
      />

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Etapas</h2>
      <DataTable
        rows={stages}
        rowKey={(stage) => stage._id.toString()}
        emptyMessage="Todavía no hay etapas."
        columns={[
          { header: "Orden", render: (stage) => stage.order },
          { header: "Título", render: (stage) => stage.title },
          {
            header: "Depende de",
            render: (stage) =>
              stageOptions.find((option) => option.id === stage.dependsOnStageId?.toString())?.title ?? "—",
          },
          { header: "Bloqueante", render: (stage) => (stage.isBlocking ? "Sí" : "No") },
          {
            header: "Estado",
            render: (stage) => <Badge variant={stage.status === "PUBLISHED" ? "success" : "neutral"}>{stage.status}</Badge>,
          },
          {
            header: "Acciones",
            render: (stage) => <StageActions stageId={stage._id.toString()} status={stage.status} />,
          },
        ]}
      />

      <div className="mt-8">
        <StageForm existingStages={stageOptions} />
      </div>
    </div>
  );
}
