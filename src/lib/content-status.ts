import { ValidationError } from "@/server/errors";
import type { ContentStatus } from "@/types/enums";

const ALLOWED_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["ARCHIVED"], // nunca PUBLISHED -> DRAFT
  // Reactivar siempre vuelve a DRAFT, nunca directo a PUBLISHED — el
  // admin revisa y publica de nuevo explícitamente, como con cualquier
  // contenido nuevo (decisión de producto, no cae directo a visible).
  ARCHIVED: ["DRAFT"],
};

/**
 * Único punto de validación del ciclo de vida DRAFT/PUBLISHED/ARCHIVED
 * (regla 29 del PRD), compartido por rutas/etapas/content_items (y en
 * 3B: líderes/procesos/pasos). Editar el contenido de un item PUBLISHED
 * sí está permitido — esto solo valida el campo `status` en sí.
 */
export function assertValidTransition(current: ContentStatus, next: ContentStatus): void {
  if (current === next) return;
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new ValidationError(`No se puede pasar de ${current} a ${next}.`);
  }
}
