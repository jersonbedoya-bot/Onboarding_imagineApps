import { redirect } from "next/navigation";
import { requireContentEditor } from "@/server/auth/session";
import { listLeadersWithMedia } from "@/server/services/leader.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { ArchivedSection } from "@/components/admin/ArchivedSection";
import { CONTENT_STATUS_LABELS } from "@/lib/status-labels";
import { LeaderForm } from "./LeaderForm";
import { LeaderActions } from "./LeaderActions";

type Leader = Awaited<ReturnType<typeof listLeadersWithMedia>>[number];

/**
 * Miniatura circular con iniciales de respaldo — mismo criterio que
 * LeaderCard.tsx (la vista real de /onboarding/leaders), a escala de fila de
 * tabla. Antes la tabla no mostraba ninguna foto: para saber "quién es
 * quién" había que abrir cada fila una por una, justo en el único módulo
 * del panel donde la cara de la persona es el dato principal.
 */
function LeaderAvatar({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-tint">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- fuente arbitraria (Vercel Blob), no un asset propio optimizable con next/image
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-xs font-semibold text-brand">{initials}</span>
      )}
    </div>
  );
}

export default async function AdminLeadersPage() {
  let identity;
  try {
    identity = await requireContentEditor();
  } catch {
    redirect("/login");
  }
  const canManageLifecycle = identity.platformRole === "ADMIN";

  const [leaders, roles] = await Promise.all([
    listLeadersWithMedia(identity),
    roleRepository.listByTenant(identity.tenantId, { includeInactive: true }),
  ]);
  // Formularios: solo roles activos. Columna "Alcance": también los inactivos, marcados.
  const roleOptions = roles
    .filter((role) => role.status === "ACTIVE")
    .map((role) => ({ id: role._id.toString(), label: role.label }));
  const roleLabelById = new Map(
    roles.map((role) => [role._id.toString(), role.status === "ACTIVE" ? role.label : `${role.label} (inactivo)`]),
  );

  const activeLeaders = leaders.filter((leader) => leader.status !== "ARCHIVED");
  const archivedLeaders = leaders.filter((leader) => leader.status === "ARCHIVED");

  // Misma separación que ya existe del lado del Imaginer (ver LeadersBoard,
  // /onboarding/leaders): "Gerencia" (scope COMMON, se le muestra a todos)
  // vs. equipos específicos por rol (scope ROLE — lo que el usuario llama
  // "los PDMs"). Antes la tabla admin era una sola lista plana con una
  // columna "Alcance" para distinguirlos — acá se ve de entrada, sin tener
  // que leer cada fila.
  const activeGerencia = activeLeaders.filter((leader) => leader.scope === "COMMON");
  const activePorRol = activeLeaders.filter((leader) => leader.scope === "ROLE");

  const columns: DataTableColumn<Leader>[] = [
    { header: "Orden", render: (leader) => leader.order },
    {
      header: "Nombre",
      render: (leader) => (
        <div className="flex items-center gap-3">
          <LeaderAvatar name={leader.name} photoUrl={leader.photoUrl} />
          <span className="font-medium text-ink">{leader.name}</span>
        </div>
      ),
    },
    { header: "Cargo", render: (leader) => leader.title },
    {
      header: "Alcance",
      render: (leader) =>
        leader.scope === "COMMON" ? "Común" : leader.roleIds.map((id) => roleLabelById.get(id.toString()) ?? "Rol eliminado").join(", "),
    },
    { header: "Video", render: (leader) => (leader.videoUrl ? leader.videoProvider : "—") },
    {
      header: "Estado",
      render: (leader) => (
        <Badge variant={leader.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[leader.status]}</Badge>
      ),
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
            photoUrl: leader.photoUrl,
            videoUrl: leader.videoUrl,
            videoProvider: leader.videoProvider,
            scope: leader.scope,
            roleIds: leader.roleIds.map((id) => id.toString()),
          }}
          roles={roleOptions}
          canManageLifecycle={canManageLifecycle}
        />
      ),
    },
  ];
  // La columna "Alcance" no aporta nada dentro de la sección "Gerencia"
  // (siempre dice "Común") — se omite ahí, y solo se ve donde sí varía.
  const gerenciaColumns = columns.filter((column) => column.header !== "Alcance");

  return (
    <div>
      <PageHeader title="Líderes" description="Personas relevantes del equipo, organizadas en Gerencia (para todos) y equipos específicos por rol." />

      <section className="mb-10">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Gerencia</h2>
        <p className="mb-3 text-sm text-ink-soft">Se muestra a todos los Imaginers, sin importar su rol.</p>
        <DataTable
          rows={activeGerencia}
          rowKey={(leader) => leader._id.toString()}
          emptyMessage="Todavía no hay líderes de gerencia."
          columns={gerenciaColumns}
        />
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Equipos por rol</h2>
        <p className="mb-3 text-sm text-ink-soft">Cada uno se muestra solo a los Imaginers del rol funcional indicado en &quot;Alcance&quot;.</p>
        <DataTable
          rows={activePorRol}
          rowKey={(leader) => leader._id.toString()}
          emptyMessage="Todavía no hay líderes específicos por rol."
          columns={columns}
        />
      </section>

      <ArchivedSection count={archivedLeaders.length}>
        <DataTable rows={archivedLeaders} rowKey={(leader) => leader._id.toString()} emptyMessage="Sin líderes archivados." columns={columns} />
      </ArchivedSection>

      <div className="mt-8">
        <LeaderForm roles={roleOptions} variant="modal" />
      </div>
    </div>
  );
}
