export const PLATFORM_ROLES = ["USER", "ADMIN"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const USER_STATUSES = ["INVITED", "ACTIVE", "INACTIVE"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// Roles funcionales iniciales del PRD. Extensible sin tocar la arquitectura
// (DEVELOPER, QA, etc. se agregan como nuevas filas en `roles`, no acá).
export const FUNCTIONAL_ROLE_KEYS = ["PDM", "UX_UI_DESIGNER"] as const;
export type FunctionalRoleKey = (typeof FUNCTIONAL_ROLE_KEYS)[number];
