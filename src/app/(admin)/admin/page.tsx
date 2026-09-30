import { redirect } from "next/navigation";
import { requireContentEditor } from "@/server/auth/session";
import * as userRepository from "@/server/repositories/user.repository";
import { listStages } from "@/server/services/stage.service";
import { listUsers } from "@/server/services/user.service";
import { listInvitations } from "@/server/services/invitation.service";
import { resolveJourneyFor } from "@/server/services/progress.service";
import { LinkButton } from "@/components/Button";
import { Icon, type IconName } from "@/components/Icon";

/**
 * Punto de entrada real del panel (antes "/" mandaba directo a
 * /admin/modules — cualquier Admin/Editor, técnico o no, caía sin aviso en
 * una lista de módulos sin ningún "para qué es esto, por dónde empiezo").
 * Pedido explícito del usuario: un panel que alguien sin nada de trasfondo
 * técnico (ej. una psicóloga, un contador) entienda de un vistazo — acá se
 * responde primero "¿cómo va el equipo?" (datos reales, no relleno) y
 * después "¿qué puedo hacer ahora?" (accesos directos a lo más común).
 *
 * Los números de personas (Imaginers, invitaciones) son ADMIN-only — un
 * Editor no gestiona usuarios (ver requireContentEditor) y ver esas cifras
 * sin poder actuar sobre ellas sería ruido, no ayuda.
 */
export default async function AdminHomePage() {
  let identity;
  try {
    identity = await requireContentEditor();
  } catch {
    redirect("/login");
  }

  const isAdmin = identity.platformRole === "ADMIN";

  const [me, stages] = await Promise.all([userRepository.findById(identity.tenantId, identity.userId), listStages(identity)]);

  const activeStages = stages.filter((s) => s.status !== "ARCHIVED");
  const publishedStages = activeStages.filter((s) => s.status === "PUBLISHED").length;

  let peopleStats: { enProgreso: number; completados: number; total: number; pendientes: number } | null = null;
  if (isAdmin) {
    const [{ items: users }, invitations] = await Promise.all([listUsers(identity, { pageSize: 200 }), listInvitations(identity)]);
    const imaginers = users.filter((u) => u.platformRole === "USER" && u.functionalRoleId);
    // Mismo patrón que /admin/users (progreso por usuario) — a esta escala
    // (decenas de personas, no miles) resolver el recorrido de cada una acá
    // es barato; no amerita una vista materializada aparte.
    const journeys = await Promise.all(
      imaginers.map((u) => resolveJourneyFor(identity.tenantId, u._id, u.functionalRoleId!)),
    );
    const completados = journeys.filter((j) => j.currentStageId === null).length;
    peopleStats = {
      total: imaginers.length,
      completados,
      enProgreso: imaginers.length - completados,
      pendientes: invitations.filter((inv) => inv.status === "PENDING").length,
    };
  }

  const firstName = me?.name?.trim().split(" ")[0];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink">{firstName ? `Hola, ${firstName} 👋` : "Hola 👋"}</h1>
        <p className="mt-1 text-sm text-ink-soft">Así está hoy el onboarding de tu equipo.</p>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {peopleStats && (
          <>
            <StatCard icon="users" label="Imaginers en su onboarding" value={peopleStats.enProgreso} />
            <StatCard icon="check" label="Onboarding completado" value={peopleStats.completados} hint={`de ${peopleStats.total} en total`} />
            {peopleStats.pendientes > 0 && (
              <StatCard icon="message" label="Invitaciones pendientes" value={peopleStats.pendientes} accent />
            )}
          </>
        )}
        <StatCard icon="grid" label="Módulos publicados" value={publishedStages} hint={`de ${activeStages.length} en total`} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Accesos rápidos</h2>
        <div className="flex flex-wrap gap-3">
          {isAdmin && <LinkButton href="/admin/users">+ Invitar usuario</LinkButton>}
          {isAdmin && (
            <LinkButton href="/admin/roles" variant="secondary">
              + Crear rol funcional
            </LinkButton>
          )}
          <LinkButton href="/admin/modules" variant="secondary">
            + Agregar módulo
          </LinkButton>
          <LinkButton href="/admin/preview" variant="secondary">
            Ver el onboarding como Imaginer
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent = false,
}: {
  icon: IconName;
  label: string;
  value: number;
  hint?: string;
  /** Para cosas que piden atención (ej. invitaciones pendientes) — mismo color de marca que ya usa el resto del panel para "esto necesita algo tuyo", no un color de alerta nuevo. */
  accent?: boolean;
}) {
  return (
    <div className={accent ? "rounded-lg border border-brand-soft bg-brand-tint p-5" : "rounded-lg border border-line bg-card p-5 shadow-sm"}>
      <div className="mb-2 flex items-center gap-2">
        <Icon name={icon} size="sm" className={accent ? "text-brand-strong" : "text-ink-soft"} />
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      </div>
      <p className={accent ? "font-display text-3xl font-semibold text-brand-strong" : "font-display text-3xl font-semibold text-ink"}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
}
