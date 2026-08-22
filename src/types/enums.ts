export const PLATFORM_ROLES = ["USER", "ADMIN"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

// "INVITED" queda RESERVADO, sin uso: un `users` nunca nace en ese estado.
// Mientras una invitación está pendiente vive solo en la colección
// `invitations` (su propio PENDING/ACCEPTED/EXPIRED/REVOKED); `users` nace
// directo en ACTIVE al aceptarla. Se deja documentado acá y en el
// $jsonSchema (src/server/db/schema.ts) por si en el futuro hace falta
// representar un usuario suspendido-antes-de-activar directamente en `users`.
export const USER_STATUSES = ["INVITED", "ACTIVE", "INACTIVE"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const INVITATION_STATUSES = ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

// Roles funcionales iniciales del PRD. Extensible sin tocar la arquitectura
// (DEVELOPER, QA, etc. se agregan como nuevas filas en `roles`, no acá).
export const FUNCTIONAL_ROLE_KEYS = ["PDM", "UX_UI_DESIGNER"] as const;
export type FunctionalRoleKey = (typeof FUNCTIONAL_ROLE_KEYS)[number];
