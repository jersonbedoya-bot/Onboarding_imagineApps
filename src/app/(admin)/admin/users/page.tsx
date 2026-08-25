import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listUsers } from "@/server/services/user.service";
import { resolveJourneyFor } from "@/server/services/progress.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { ProgressBar } from "@/components/ProgressBar";
import { InviteUserForm } from "./InviteUserForm";
import { UserActions } from "./UserActions";

export default async function AdminUsersPage() {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const [{ items: users }, roles] = await Promise.all([
    listUsers(identity, {}),
    roleRepository.listByTenant(identity.tenantId),
  ]);

  const roleOptions = roles.map((role) => ({ id: role._id.toString(), label: role.label }));
  const currentUserId = identity.userId.toString();

  // Progreso de onboarding por usuario — solo aplica a USER con rol
  // funcional asignado (un ADMIN nunca hace el recorrido).
  const progressEntries = await Promise.all(
    users
      .filter((user) => user.functionalRoleId)
      .map(async (user) => {
        const journey = await resolveJourneyFor(identity.tenantId, user._id, user.functionalRoleId!);
        const completed = journey.stages.filter((stage) => stage.status === "COMPLETE").length;
        return [user._id.toString(), { completed, total: journey.stages.length }] as const;
      }),
  );
  const progressByUserId = new Map(progressEntries);

  return (
    <div>
      <PageHeader title="Usuarios" description="Gestión de acceso y rol funcional de tu tenant." />

      <div className="mb-8">
        <InviteUserForm roles={roleOptions} />
      </div>

      <DataTable
        rows={users}
        rowKey={(user) => user._id.toString()}
        emptyMessage="Todavía no hay usuarios."
        columns={[
          { header: "Email", render: (user) => user.email },
          { header: "Nombre", render: (user) => user.name },
          {
            header: "Rol",
            render: (user) => roleOptions.find((r) => r.id === user.functionalRoleId?.toString())?.label ?? "—",
          },
          {
            header: "Estado",
            render: (user) => <Badge variant={user.status === "ACTIVE" ? "success" : "neutral"}>{user.status}</Badge>,
          },
          {
            header: "Progreso onboarding",
            render: (user) => {
              if (!user.functionalRoleId) {
                return <span className="text-xs text-ink-soft">No aplica</span>;
              }
              const progress = progressByUserId.get(user._id.toString());
              if (!progress || progress.total === 0) {
                return <span className="text-xs text-ink-soft">Sin ruta publicada</span>;
              }
              return (
                <div className="min-w-[8rem]">
                  <ProgressBar
                    value={(progress.completed / progress.total) * 100}
                    label={`${progress.completed}/${progress.total}`}
                  />
                </div>
              );
            },
          },
          {
            header: "Acciones",
            render: (user) => (
              <UserActions
                userId={user._id.toString()}
                status={user.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                functionalRoleId={user.functionalRoleId?.toString() ?? null}
                roles={roleOptions}
                isSelf={user._id.toString() === currentUserId}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
