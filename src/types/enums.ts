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

// Ciclo de vida de todo contenido administrable (regla 29 del PRD):
// rutas, etapas, content_items y — en 3B — líderes/procesos/pasos.
export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_ITEM_TYPES = ["TEXT", "VIDEO", "IMAGE", "MIXED"] as const;
export type ContentItemType = (typeof CONTENT_ITEM_TYPES)[number];

export const CONTENT_SCOPES = ["COMMON", "ROLE"] as const;
export type ContentScope = (typeof CONTENT_SCOPES)[number];

// Solo relevante para contenido tipo "No negociables" (PRD sección 20).
export const CONTENT_REQUIREMENTS = ["OBLIGATORY", "INFORMATIONAL"] as const;
export type ContentRequirement = (typeof CONTENT_REQUIREMENTS)[number];

// Video = URL embebida (YouTube/Vimeo/Loom), nunca archivo subido — evita
// el límite de tamaño de las funciones serverless. Ver src/lib/video-url.ts.
export const VIDEO_PROVIDERS = ["YOUTUBE", "VIMEO", "LOOM"] as const;
export type VideoProvider = (typeof VIDEO_PROVIDERS)[number];

// Media (colección `media`) es solo imágenes en el MVP — el video nunca
// pasa por acá, ver VIDEO_PROVIDERS arriba.
export const MEDIA_TYPES = ["IMAGE"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];
