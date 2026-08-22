import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listLeaders } from "@/server/services/leader.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { LeaderForm } from "./LeaderForm";
import { LeaderActions } from "./LeaderActions";

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe.
export default async function AdminLeadersPage() {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const [leaders, roles] = await Promise.all([listLeaders(identity), roleRepository.listByTenant(identity.tenantId)]);
  const roleOptions = roles.map((role) => ({ id: role._id.toString(), label: role.label }));

  return (
    <main>
      <h1>Líderes</h1>

      <DataTable
        rows={leaders}
        rowKey={(leader) => leader._id.toString()}
        emptyMessage="Todavía no hay líderes."
        columns={[
          { header: "Orden", render: (leader) => leader.order },
          { header: "Nombre", render: (leader) => leader.name },
          { header: "Cargo", render: (leader) => leader.title },
          {
            header: "Alcance",
            render: (leader) =>
              leader.scope === "COMMON"
                ? "Todos"
                : leader.roleIds.map((id) => roleOptions.find((r) => r.id === id.toString())?.label ?? "?").join(", "),
          },
          { header: "Video", render: (leader) => (leader.videoUrl ? leader.videoProvider : "—") },
          { header: "Estado", render: (leader) => leader.status },
          {
            header: "Acciones",
            render: (leader) => <LeaderActions id={leader._id.toString()} status={leader.status} />,
          },
        ]}
      />

      <LeaderForm roles={roleOptions} />
    </main>
  );
}
