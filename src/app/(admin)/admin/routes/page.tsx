import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { ensureRoute } from "@/server/services/route.service";
import { listStages } from "@/server/services/stage.service";
import { DataTable } from "@/components/DataTable";
import { RouteActions } from "./RouteActions";
import { StageActions } from "./StageActions";
import { StageForm } from "./StageForm";

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe.
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
    <main>
      <h1>Ruta de onboarding</h1>
      <p>
        Estado: {route.status} <RouteActions status={route.status} />
      </p>

      <h2>Etapas</h2>
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
          { header: "Estado", render: (stage) => stage.status },
          {
            header: "Acciones",
            render: (stage) => <StageActions stageId={stage._id.toString()} status={stage.status} />,
          },
        ]}
      />

      <StageForm existingStages={stageOptions} />
    </main>
  );
}
