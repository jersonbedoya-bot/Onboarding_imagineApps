import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listLeaders } from "@/server/services/leader.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { LeaderForm } from "./LeaderForm";
import { LeaderActions } from "./LeaderActions";

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
    <div>
      <PageHeader title="Líderes" description="Personas relevantes del equipo — comunes o específicas por rol." />

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
          {
            header: "Estado",
            render: (leader) => <Badge variant={leader.status === "PUBLISHED" ? "success" : "neutral"}>{leader.status}</Badge>,
          },
          {
            header: "Acciones",
            render: (leader) => (
              <LeaderActions
                item={{
                  id: leader._id.toString(),
                  status: leader.status,
                  name: leader.name,
                  title: leader.title,
                  description: leader.description,
                  photoMediaId: leader.photoMediaId ? leader.photoMediaId.toString() : null,
                  videoUrl: leader.videoUrl,
                  scope: leader.scope,
                  roleIds: leader.roleIds.map((id) => id.toString()),
                }}
                roles={roleOptions}
              />
            ),
          },
        ]}
      />

      <div className="mt-8">
        <LeaderForm roles={roleOptions} />
      </div>
    </div>
  );
}
