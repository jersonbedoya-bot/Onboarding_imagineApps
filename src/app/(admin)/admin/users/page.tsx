import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listUsers } from "@/server/services/user.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
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
