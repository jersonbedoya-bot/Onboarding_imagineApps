import type { AuditAction } from "@/server/repositories/audit.repository";

/** Para que la tabla de /admin/audit no muestre el enum crudo (CONTENT_UPDATED) tal cual. */
export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  INVITATION_CREATED: "Invitación creada",
  USER_CREATED: "Usuario creado",
  USER_DEACTIVATED: "Usuario desactivado",
  USER_REACTIVATED: "Usuario reactivado",
  USER_ROLE_CHANGED: "Rol funcional cambiado",
  USER_PLATFORM_ROLE_CHANGED: "Nivel de acceso cambiado",
  ROUTE_CREATED: "Ruta creada",
  ROUTE_UPDATED: "Ruta editada",
  ROUTE_PUBLISHED: "Ruta publicada",
  ROUTE_ARCHIVED: "Ruta archivada",
  ROUTE_REACTIVATED: "Ruta reactivada",
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

/** Prefijo legible para la columna "Recurso" cuando no hay título propio que mostrar (ver metadata.title). */
export const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  invitation: "Invitación",
  user: "Usuario",
  route: "Ruta",
  stage: "Módulo",
  content_item: "Contenido",
  leader: "Líder",
  process: "Proceso",
  process_step: "Paso",
  media: "Archivo",
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
  isBlocking: "Bloqueante",
};
