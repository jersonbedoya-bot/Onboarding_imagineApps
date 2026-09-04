import type { ContentStatus, InvitationStatus, UserStatus } from "@/types/enums";

/** Para los Badge de estado que hoy mostraban el enum en inglés tal cual (DRAFT/PUBLISHED/...). */
export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  INVITED: "Invitado",
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: "Pendiente",
  ACCEPTED: "Aceptada",
  EXPIRED: "Expirada",
  REVOKED: "Revocada",
};
