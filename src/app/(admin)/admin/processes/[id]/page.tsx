import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { listStepsByProcess } from "@/server/services/step.service";
import * as processRepository from "@/server/repositories/process.repository";
import { DataTable } from "@/components/DataTable";
import { ProcessActions } from "../ProcessActions";
import { StepForm } from "./StepForm";
import { StepActions } from "./StepActions";

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe.
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

  const steps = await listStepsByProcess(identity, process._id);

  return (
    <main>
      <h1>{process.title}</h1>
      <p>
        Estado: {process.status} <ProcessActions id={process._id.toString()} status={process.status} />
      </p>
      <p>
        <strong>Objetivo:</strong> {process.objective || "—"}
      </p>

      <h2>Pasos</h2>
      <DataTable
        rows={steps}
        rowKey={(step) => step._id.toString()}
        emptyMessage="Este proceso todavía no tiene pasos."
        columns={[
          { header: "Orden", render: (step) => step.order },
          { header: "Título", render: (step) => step.title },
          { header: "Video", render: (step) => (step.videoUrl ? step.videoProvider : "—") },
          { header: "Estado", render: (step) => step.status },
          {
            header: "Acciones",
            render: (step) => <StepActions id={step._id.toString()} status={step.status} />,
          },
        ]}
      />

      <StepForm processId={process._id.toString()} />
    </main>
  );
}
