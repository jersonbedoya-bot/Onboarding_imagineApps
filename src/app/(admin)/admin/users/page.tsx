import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listUsers } from "@/server/services/user.service";
import { resolveJourneyFor } from "@/server/services/progress.service";
import { listInvitations } from "@/server/services/invitation.service";
import * as roleRepository from "@/server/repositories/role.repository";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Badge } from "@/components/Badge";
import { ProgressBar } from "@/components/ProgressBar";
import { PlatformRoleBadge } from "@/components/admin/PlatformRoleBadge";
import { USER_STATUS_LABELS } from "@/lib/status-labels";
import { InviteUserForm } from "./InviteUserForm";
import { UserActions } from "./UserActions";
import { InvitationsList } from "./InvitationsList";
import { FunctionalRoleSelect } from "./FunctionalRoleSelect";

const USERS_PAGE_SIZE = 1000;

export default async function AdminUsersPage() {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  // pageSize alto a propósito: antes se usaba el default del service (20) y
  // a partir de la persona 21 desaparecían del listado sin ningún aviso.
  const [{ items: users, total: totalUsers }, allRoles, invitations] = await Promise.all([
    listUsers(identity, { pageSize: USERS_PAGE_SIZE }),
    roleRepository.listByTenant(identity.tenantId, { includeInactive: true }),
    listInvitations(identity),
  ]);

  // Solo los roles activos se ofrecen para asignar; los inactivos se siguen
  // mostrando con su nombre + "(inactivo)" en quien ya los tiene, en vez de
  // que el select caiga en silencio al primer rol de la lista.
  const roleOptions = allRoles
    .filter((role) => role.status === "ACTIVE")
    .map((role) => ({ id: role._id.toString(), label: role.label }));
  const roleLabelById = new Map(
    allRoles.map((role) => [role._id.toString(), role.status === "ACTIVE" ? role.label : `${role.label} (inactivo)`]),
  );
  const currentUserId = identity.userId.toString();

  // Separación pedida por el usuario: antes todo vivía en una sola tabla y
  // no había forma de distinguir de un vistazo quién es Admin/Editor de
  // quién es Imaginer — acá el equipo administrativo (pocos, sin columnas
  // de rol funcional/progreso que no les aplican) va en un roster propio
  // arriba, separado de la tabla completa de Imaginers.
  const adminTeam = users.filter((user) => user.platformRole !== "USER");
  const imaginers = users.filter((user) => user.platformRole === "USER");

  // Progreso de onboarding por usuario — solo aplica a Imaginers con rol
  // funcional asignado (Admin/Editor nunca hacen el recorrido).
  const progressEntries = await Promise.all(
    imaginers
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
      <PageHeader title="Usuarios" description="Gestión de acceso y rol funcional de tu organización." />

      <section className="mb-10">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Equipo administrativo</h2>
        <p className="mb-3 text-sm text-ink-soft">
          Un <strong className="text-ink">Administrador</strong> gestiona todo el panel, incluyendo usuarios y permisos. Un{" "}
          <strong className="text-ink">Editor</strong> puede crear y editar contenido, procesos y líderes del onboarding, pero
          no puede borrar/archivar nada ni gestionar usuarios ni roles.
        </p>
        {adminTeam.length === 0 ? (
          <p className="text-sm text-ink-soft">Todavía no hay administradores ni editores.</p>
        ) : (
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-card p-2">
            {adminTeam.map((user) => {
              const isSelf = user._id.toString() === currentUserId;
              return (
                <div key={user._id.toString()} className="flex flex-wrap items-center justify-between gap-3 rounded-md p-3 hover:bg-paper">
                  <div className="flex min-w-0 items-center gap-3">
                    <PlatformRoleBadge role={user.platformRole} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                      <p className="truncate text-xs text-ink-soft">{user.email}</p>
                    </div>
                    <Badge variant={user.status === "ACTIVE" ? "success" : "neutral"}>{USER_STATUS_LABELS[user.status]}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserActions
                      userId={user._id.toString()}
                      userName={user.name}
                      status={user.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                      currentPlatformRole={user.platformRole}
                      functionalRoleId={null}
                      roles={roleOptions}
                      isSelf={isSelf}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Imaginers</h2>
        {totalUsers > users.length && (
          <p className="mb-3 text-sm text-danger">
            Mostrando {users.length} de {totalUsers} cuentas — hay más personas que no entran en este listado.
          </p>
        )}
        <DataTable
          rows={imaginers}
          rowKey={(user) => user._id.toString()}
          emptyMessage="Todavía no hay imaginers."
          columns={[
            { header: "Email", render: (user) => user.email },
            { header: "Nombre", render: (user) => user.name },
            {
              header: "Rol funcional",
              render: (user) =>
                user.functionalRoleId ? (
                  <FunctionalRoleSelect
                    userId={user._id.toString()}
                    functionalRoleId={user.functionalRoleId.toString()}
                    currentRoleLabel={roleLabelById.get(user.functionalRoleId.toString()) ?? "Rol eliminado"}
                    roles={roleOptions}
                  />
                ) : (
                  "—"
                ),
            },
            {
              header: "Estado",
              render: (user) => <Badge variant={user.status === "ACTIVE" ? "success" : "neutral"}>{USER_STATUS_LABELS[user.status]}</Badge>,
            },
            {
              header: "Progreso onboarding",
              render: (user) => {
                if (!user.functionalRoleId) {
                  return <span className="text-xs text-ink-soft">No aplica</span>;
                }
                const progress = progressByUserId.get(user._id.toString());
                if (!progress || progress.total === 0) {
                  return <span className="text-xs text-ink-soft">Sin módulos publicados</span>;
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
                <div className="flex flex-wrap items-center gap-2">
                  <UserActions
                    userId={user._id.toString()}
                    userName={user.name}
                    status={user.status === "ACTIVE" ? "ACTIVE" : "INACTIVE"}
                    currentPlatformRole={user.platformRole}
                    functionalRoleId={user.functionalRoleId?.toString() ?? null}
                    roles={roleOptions}
                    isSelf={user._id.toString() === currentUserId}
                  />
                </div>
              ),
            },
          ]}
        />
      </section>

      <div className="mt-8">
        <InviteUserForm roles={roleOptions} />
      </div>

      <div className="mt-10">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Invitaciones</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Control de las invitaciones enviadas. Si perdiste el link de una pendiente o elegiste el rol equivocado, revócala
          y vuelve a invitar a ese mismo email desde &quot;+ Invitar usuario&quot; — no hace falta esperar a que expire (7
          días).
        </p>
        <InvitationsList
          invitations={invitations}
          roles={[...roleLabelById].map(([id, label]) => ({ id, label }))}
          users={users.map((user) => ({ id: user._id.toString(), name: user.name, email: user.email }))}
        />
      </div>
    </div>
  );
}
