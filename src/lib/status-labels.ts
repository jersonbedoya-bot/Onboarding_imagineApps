import type { ContentStatus, UserStatus } from "@/types/enums";

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
