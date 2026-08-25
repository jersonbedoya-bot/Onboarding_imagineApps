import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { listStepsByProcess } from "@/server/services/step.service";
import * as processRepository from "@/server/repositories/process.repository";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { ProcessActions } from "../ProcessActions";
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

  const [steps, roles] = await Promise.all([
    listStepsByProcess(identity, process._id),
    roleRepository.listByTenant(identity.tenantId),
  ]);
  const roleOptions = roles.map((role) => ({ id: role._id.toString(), label: role.label }));

  return (
    <div>
      <PageHeader
        title={process.title}
        description={process.objective || undefined}
        action={
          <div className="flex items-center gap-3">
            <Badge variant={process.status === "PUBLISHED" ? "success" : "neutral"}>{process.status}</Badge>
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
                roleIds: process.roleIds.map((rid) => rid.toString()),
              }}
              roles={roleOptions}
            />
          </div>
        }
      />

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Pasos</h2>
      <DataTable
        rows={steps}
        rowKey={(step) => step._id.toString()}
        emptyMessage="Este proceso todavía no tiene pasos."
        columns={[
          { header: "Orden", render: (step) => step.order },
          { header: "Título", render: (step) => step.title },
          { header: "Video", render: (step) => (step.videoUrl ? step.videoProvider : "—") },
          {
            header: "Estado",
            render: (step) => <Badge variant={step.status === "PUBLISHED" ? "success" : "neutral"}>{step.status}</Badge>,
          },
          {
            header: "Acciones",
            render: (step) => (
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
        ]}
      />

      <div className="mt-8">
        <StepForm processId={process._id.toString()} />
      </div>
    </div>
  );
}
