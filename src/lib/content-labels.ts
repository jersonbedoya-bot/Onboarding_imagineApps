import type { ContentItemType, ContentRequirement } from "@/types/enums";

export const CONTENT_TYPE_LABELS: Record<ContentItemType, string> = {
  TEXT: "Texto",
  VIDEO: "Video",
  IMAGE: "Imagen",
  MIXED: "Mixto (texto + video/imagen)",
};

export const CONTENT_REQUIREMENT_LABELS: Record<ContentRequirement, string> = {
  OBLIGATORY: "Obligatorio — debe marcarlo como leído para avanzar",
  INFORMATIONAL: "Informativo — solo de consulta, no bloquea nada",
};
