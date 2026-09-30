import type { AuditAction } from "@/server/repositories/audit.repository";

/** Para que la tabla de /admin/audit no muestre el enum crudo (CONTENT_UPDATED) tal cual. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  INVITATION_CREATED: "Invitación creada",
  INVITATION_REVOKED: "Invitación revocada",
  USER_CREATED: "Usuario creado",
  USER_DEACTIVATED: "Usuario desactivado",
  USER_REACTIVATED: "Usuario reactivado",
  USER_ROLE_CHANGED: "Rol funcional cambiado",
  USER_PLATFORM_ROLE_CHANGED: "Nivel de acceso cambiado",
  USER_DELETED: "Usuario eliminado",
  USER_PASSWORD_RESET: "Contraseña restablecida",
  USER_ONBOARDING_RESET: "Onboarding reiniciado",
  ROLE_CREATED: "Rol funcional creado",
  ROLE_UPDATED: "Rol funcional editado",
  ROLE_DEACTIVATED: "Rol funcional desactivado",
  ROLE_REACTIVATED: "Rol funcional reactivado",
  ROUTE_CREATED: "Onboarding creado",
  ROUTE_UPDATED: "Mensajes de guía editados",
  ROUTE_PUBLISHED: "Onboarding publicado",
  ROUTE_ARCHIVED: "Onboarding archivado",
  ROUTE_REACTIVATED: "Onboarding reactivado",
  STAGE_CREATED: "Módulo creado",
  STAGE_UPDATED: "Módulo editado",
  STAGE_PUBLISHED: "Módulo publicado",
  STAGE_ARCHIVED: "Módulo archivado",
  STAGE_REACTIVATED: "Módulo reactivado",
  STAGE_DELETED: "Módulo eliminado",
  CONTENT_CREATED: "Contenido creado",
  CONTENT_UPDATED: "Contenido editado",
  CONTENT_PUBLISHED: "Contenido publicado",
  CONTENT_ARCHIVED: "Contenido archivado",
  CONTENT_REACTIVATED: "Contenido reactivado",
  CONTENT_DELETED: "Contenido eliminado",
  LEADER_CREATED: "Líder creado",
  LEADER_UPDATED: "Líder editado",
  LEADER_PUBLISHED: "Líder publicado",
  LEADER_ARCHIVED: "Líder archivado",
  LEADER_REACTIVATED: "Líder reactivado",
  LEADER_DELETED: "Líder eliminado",
  PROCESS_CREATED: "Proceso creado",
  PROCESS_UPDATED: "Proceso editado",
  PROCESS_PUBLISHED: "Proceso publicado",
  PROCESS_ARCHIVED: "Proceso archivado",
  PROCESS_REACTIVATED: "Proceso reactivado",
  PROCESS_DELETED: "Proceso eliminado",
  STEP_CREATED: "Paso creado",
  STEP_UPDATED: "Paso editado",
  STEP_PUBLISHED: "Paso publicado",
  STEP_ARCHIVED: "Paso archivado",
  STEP_REACTIVATED: "Paso reactivado",
  STEP_DELETED: "Paso eliminado",
  MEDIA_UPLOADED: "Archivo subido",
};

/**
 * Agrupa el filtro "Acción" de /admin/audit por tipo de recurso (ver
 * AuditFilters.tsx, <optgroup>) — antes eran ~30 valores técnicos en un
 * único <select> plano (INVITATION_CREATED, USER_DEACTIVATED, STAGE_
 * PUBLISHED...), difícil de escanear para encontrar uno puntual. Prefijo =
 * primer segmento de la AuditAction (ver AUDIT_ACTIONS) antes del primer "_".
 */
export const AUDIT_ACTION_GROUP_LABELS: Record<string, string> = {
  INVITATION: "Invitaciones",
  USER: "Usuarios",
  ROLE: "Roles funcionales",
  ROUTE: "Onboarding completo",
  STAGE: "Módulos",
  CONTENT: "Contenido",
  LEADER: "Líderes",
  PROCESS: "Procesos",
  STEP: "Pasos",
  MEDIA: "Archivos",
};

/** Prefijo legible para la columna "Recurso" cuando no hay título propio que mostrar (ver metadata.title). */
export const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  invitation: "Invitación",
  user: "Usuario",
  role: "Rol funcional",
  route: "Onboarding",
  stage: "Módulo",
  content_item: "Contenido",
  leader: "Líder",
  process: "Proceso",
  process_step: "Paso",
  media: "Archivo",
};

/** Para la columna "Detalles" de INVITATION_CREATED (ver AuditDetails.tsx) — mismo texto que ya usa InviteUserForm. */
export const AUDIT_PLATFORM_ROLE_LABELS: Record<string, string> = {
  USER: "Imaginer",
  EDITOR: "Editor",
  ADMIN: "Administrador",
};

/**
 * Nombre de campo -> label del formulario admin correspondiente, para la
 * columna "Detalles" de /admin/audit (ver metadata.changes, armado por
 * diffFields en cada *.service.ts). Un campo sin entrada acá se muestra
 * con su nombre técnico tal cual — no bloquea el render, solo se ve menos
 * pulido.
 */
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  title: "Título",
  name: "Nombre",
  body: "Contenido",
  description: "Descripción",
  instruction: "Instrucción",
  objective: "Objetivo",
  context: "Contexto",
  expectedResult: "Resultado esperado",
  resources: "Recursos",
  links: "Links",
  completionCriteria: "Criterio de completado",
  scope: "Alcance",
  roleIds: "Roles",
  requirement: "Obligatoriedad",
  order: "Orden",
  type: "Tipo",
  videoUrl: "Video",
  videoProvider: "Proveedor de video",
  mediaId: "Imagen",
  photoMediaId: "Foto",
  dependsOnStageId: "Depende de",
  isBlocking: "Obligatorio para los que dependen de él",
};
