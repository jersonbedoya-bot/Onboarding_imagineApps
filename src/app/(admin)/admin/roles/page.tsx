import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listRolesForAdmin } from "@/server/services/role.service";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { ArchivedSection } from "@/components/admin/ArchivedSection";
import { RoleForm } from "./RoleForm";
import { RoleActions } from "./RoleActions";

type Role = Awaited<ReturnType<typeof listRolesForAdmin>>[number];

/**
 * Antes no existía ninguna pantalla para esto: un rol funcional (Diseño,
 * Ventas...) solo se podía crear corriendo `npm run db:seed` con un cambio
 * de código — un tenant nuevo sin roles no podía invitar ni un solo
 * Imaginer (ver InviteUserForm, exige elegir uno). ADMIN-only, igual que
 * Usuarios: es configuración estructural del tenant, no contenido del
 * recorrido (por eso vive en el grupo "Personas" del nav, no en "Contenido
 * del recorrido").
 */
export default async function AdminRolesPage() {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const roles = await listRolesForAdmin(identity);
  const activeRoles = roles.filter((role) => role.status === "ACTIVE");
  const inactiveRoles = roles.filter((role) => role.status === "INACTIVE");

  const columns: DataTableColumn<Role>[] = [
    { header: "Nombre", render: (role) => <span className="font-medium text-ink">{role.label}</span> },
    {
      header: "Personas",
      render: (role) => (role.peopleCount > 0 ? `${role.peopleCount} ${role.peopleCount === 1 ? "persona" : "personas"}` : "—"),
    },
    {
      header: "Estado",
      render: (role) => <Badge variant={role.status === "ACTIVE" ? "success" : "neutral"}>{role.status === "ACTIVE" ? "Activo" : "Inactivo"}</Badge>,
    },
    {
      header: "Acciones",
      render: (role) => (
        <RoleActions roleId={role._id.toString()} label={role.label} status={role.status} peopleCount={role.peopleCount} />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Roles funcionales"
        description="Los roles que puedes asignar a un Imaginer al invitarlo (ej. Diseño, Ventas) — determinan qué contenido, procesos y líderes ve en su recorrido, además de lo común a todos."
      />

      <DataTable rows={activeRoles} rowKey={(role) => role._id.toString()} emptyMessage="Todavía no hay roles funcionales — crea el primero abajo." columns={columns} />
      <ArchivedSection count={inactiveRoles.length} label="inactivos">
        <DataTable rows={inactiveRoles} rowKey={(role) => role._id.toString()} emptyMessage="Sin roles inactivos." columns={columns} />
      </ArchivedSection>

      <div className="mt-8">
        <RoleForm />
      </div>
    </div>
  );
}
