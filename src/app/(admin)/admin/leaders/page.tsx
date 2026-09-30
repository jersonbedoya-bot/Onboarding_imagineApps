import { requireContentEditor } from "@/server/auth/session";
import { redirectForGuardError } from "@/server/auth/guard-redirect";
import { listLeadersWithMedia } from "@/server/services/leader.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { ArchivedSection } from "@/components/admin/ArchivedSection";
import { CONTENT_STATUS_LABELS } from "@/lib/status-labels";
import type { VideoProvider } from "@/types/enums";
import { LeaderForm } from "./LeaderForm";
import { LeaderActions } from "./LeaderActions";

type Leader = Awaited<ReturnType<typeof listLeadersWithMedia>>[number];

// Antes la columna "Video" mostraba el valor interno tal cual ("GOOGLE_DRIVE").
const VIDEO_PROVIDER_LABELS: Record<VideoProvider, string> = {
  YOUTUBE: "YouTube",
  VIMEO: "Vimeo",
  LOOM: "Loom",
  GOOGLE_DRIVE: "Google Drive",
};

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
  } catch (error) {
    return redirectForGuardError(error);
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

  function renderScope(leader: Leader) {
    return leader.scope === "COMMON"
      ? "Común"
      : leader.roleIds.map((id) => roleLabelById.get(id.toString()) ?? "Rol eliminado").join(", ");
  }

  function renderStatus(leader: Leader) {
    return <Badge variant={leader.status === "PUBLISHED" ? "success" : "neutral"}>{CONTENT_STATUS_LABELS[leader.status]}</Badge>;
  }

  function renderActions(leader: Leader) {
    return (
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
    );
  }

  /**
   * Por debajo de sm la tabla (7 columnas) no entra y las acciones quedaban
   * fuera de la pantalla: ahí cada líder se muestra como tarjeta (foto,
   * nombre, cargo, datos clave y, debajo, sus acciones), igual que el "Equipo
   * administrativo" de Usuarios. Se resuelve acá y no en DataTable porque
   * cada pantalla decide qué datos son los clave de su tarjeta.
   */
  function renderLeaderList(rows: Leader[], emptyMessage: string, tableColumns: DataTableColumn<Leader>[], showScope: boolean) {
    const table = <DataTable rows={rows} rowKey={(leader) => leader._id.toString()} emptyMessage={emptyMessage} columns={tableColumns} />;
    // Sin filas, DataTable ya muestra su estado vacío, que sí entra en móvil.
    if (rows.length === 0) return table;

    return (
      <>
        <div className="hidden sm:block">{table}</div>
        <div className="sm:hidden">
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-card p-2">
            {rows.map((leader) => (
              <div key={leader._id.toString()} className="flex flex-col gap-3 border-b border-line p-3 last:border-0">
                <div className="flex min-w-0 items-start gap-3">
                  <LeaderAvatar name={leader.name} photoUrl={leader.photoUrl} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{leader.name}</p>
                    <p className="truncate text-xs text-ink-soft">{leader.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                      {renderStatus(leader)}
                      {showScope && <span>{renderScope(leader)}</span>}
                      {leader.videoUrl && leader.videoProvider && <span>Video: {VIDEO_PROVIDER_LABELS[leader.videoProvider]}</span>}
                    </div>
                  </div>
                </div>
                {renderActions(leader)}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

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
    { header: "Alcance", render: renderScope },
    {
      header: "Video",
      render: (leader) => (leader.videoUrl && leader.videoProvider ? VIDEO_PROVIDER_LABELS[leader.videoProvider] : "—"),
    },
    { header: "Estado", render: renderStatus },
    { header: "Acciones", render: renderActions },
  ];
  // La columna "Alcance" no aporta nada dentro de la sección "Gerencia"
  // (siempre dice "Común") — se omite ahí, y solo se ve donde sí varía.
  const gerenciaColumns = columns.filter((column) => column.header !== "Alcance");

  return (
    <div>
      <PageHeader
        title="Líderes"
        description="Personas relevantes del equipo, organizadas en Gerencia (para todos) y equipos específicos por rol."
        action={<LeaderForm roles={roleOptions} variant="modal" />}
      />

      <section className="mb-10">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Gerencia</h2>
        <p className="mb-3 text-sm text-ink-soft">Se muestra a todos los Imaginers, sin importar su rol.</p>
        {renderLeaderList(activeGerencia, "Todavía no hay líderes de gerencia.", gerenciaColumns, false)}
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Equipos por rol</h2>
        <p className="mb-3 text-sm text-ink-soft">Cada uno se muestra solo a los Imaginers del rol funcional indicado en &quot;Alcance&quot;.</p>
        {renderLeaderList(activePorRol, "Todavía no hay líderes específicos por rol.", columns, true)}
      </section>

      <ArchivedSection count={archivedLeaders.length}>
        {renderLeaderList(archivedLeaders, "Sin líderes archivados.", columns, true)}
      </ArchivedSection>
    </div>
  );
}
