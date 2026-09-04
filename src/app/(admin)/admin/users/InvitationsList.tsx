import type { InvitationListItem } from "@/server/services/invitation.service";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { Badge, type BadgeVariant } from "@/components/Badge";
import { INVITATION_STATUS_LABELS } from "@/lib/status-labels";

const STATUS_BADGE_VARIANT: Record<InvitationListItem["status"], BadgeVariant> = {
  PENDING: "brand",
  ACCEPTED: "success",
  EXPIRED: "neutral",
  REVOKED: "danger",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

/**
 * Control de invitaciones: el usuario pidió esto después de crear una
 * invitación, perder el mensaje con el link antes de copiarlo, y no tener
 * dónde volver a ver que esa invitación había quedado pendiente. Es solo
 * visibilidad — no hay columna de acciones porque no existe revocar/reenviar
 * todavía (ver BACKLOG.md); si una invitación expira sin aceptarse, hoy la
 * única salida es esperar los 7 días para poder invitar de nuevo ese email.
 */
export function InvitationsList({
  invitations,
  roles,
  users,
}: {
  invitations: InvitationListItem[];
  roles: { id: string; label: string }[];
  users: { id: string; name: string; email: string }[];
}) {
  const columns: DataTableColumn<InvitationListItem>[] = [
    { header: "Email", render: (inv) => inv.email },
    {
      header: "Tipo",
      render: (inv) =>
        inv.platformRole === "ADMIN"
          ? "Administrador"
          : inv.platformRole === "EDITOR"
            ? "Editor"
            : (roles.find((r) => r.id === inv.functionalRoleId)?.label ?? "Imaginer"),
    },
    {
      header: "Estado",
      render: (inv) => <Badge variant={STATUS_BADGE_VARIANT[inv.status]}>{INVITATION_STATUS_LABELS[inv.status]}</Badge>,
    },
    { header: "Enviada", render: (inv) => formatDate(inv.createdAt) },
    {
      header: "Expira",
      render: (inv) => (inv.status === "PENDING" ? formatDate(inv.expiresAt) : "—"),
    },
    { header: "Invitada por", render: (inv) => users.find((u) => u.id === inv.invitedBy)?.name ?? "—" },
  ];

  return (
    <DataTable
      rows={invitations}
      rowKey={(inv) => inv.id}
      emptyMessage="Todavía no se ha enviado ninguna invitación."
      columns={columns}
    />
  );
}
