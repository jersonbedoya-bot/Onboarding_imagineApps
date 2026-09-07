import type { ContentDisplayFormat, ContentItemType, ContentRequirement } from "@/types/enums";

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

// Ver src/lib/content-display.ts para el detalle de qué patrón de texto
// espera cada formato dentro de "Cuerpo".
export const CONTENT_DISPLAY_FORMAT_LABELS: Record<ContentDisplayFormat, string> = {
  PROSE: "Narrativa (texto plano)",
  FACT_GRID: "Hechos paralelos (tarjetas siempre visibles)",
  VALUES_GRID: "Valores/cultura (tarjetas con clic para descubrir)",
  TIMELINE: "Cronología (línea de tiempo)",
  STEPS: "Procedimiento (pasos numerados)",
  QUIZ: "Quiz de opción múltiple",
};

export const CONTENT_DISPLAY_FORMAT_HINTS: Record<ContentDisplayFormat, string> = {
  PROSE: "Cualquier texto — sin un patrón especial que respetar.",
  FACT_GRID: 'Una viñeta por hecho: "- **Título:** descripción" (o "- **Título** (Categoría): descripción" para agregar una etiqueta).',
  VALUES_GRID: 'Una línea numerada por valor: "1. **Título:** descripción".',
  TIMELINE: 'Una viñeta por hito, con el año dentro de la negrita: "- **Año — Título**: descripción".',
  STEPS: 'Una línea numerada por paso, sin negrita: "1. instrucción completa".',
  QUIZ: 'Preguntas numeradas + opciones "- texto" (la correcta en **negrita**) — usa "Insertar bloque → 🎉 Pregunta de quiz".',
};
