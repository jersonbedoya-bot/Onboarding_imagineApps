import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listUsers } from "@/server/services/user.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { InviteUserForm } from "./InviteUserForm";
import { UserActions } from "./UserActions";

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe (ver AGENTS/PRD punto 44-45).
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
    <main>
      <h1>Usuarios</h1>

      <InviteUserForm roles={roleOptions} />

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Nombre</th>
            <th>Rol</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id.toString()}>
              <td>{user.email}</td>
              <td>{user.name}</td>
              <td>{roleOptions.find((r) => r.id === user.functionalRoleId?.toString())?.label ?? "—"}</td>
              <td>{user.status}</td>
              <td>
                <UserActions
                  userId={user._id.toString()}
                  status={user.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                  functionalRoleId={user.functionalRoleId?.toString() ?? null}
                  roles={roleOptions}
                  isSelf={user._id.toString() === currentUserId}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
