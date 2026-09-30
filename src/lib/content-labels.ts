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

// Nombre corto de cada formato — el de la columna "Tipo" en la tabla de
// contenido de un módulo. Antes esa columna mostraba el tipo de medio
// (CONTENT_TYPE_LABELS), que es "Texto" para casi todo, así que no se
// distinguía un quiz de una línea de tiempo.
export const CONTENT_DISPLAY_FORMAT_SHORT_LABELS: Record<ContentDisplayFormat, string> = {
  PROSE: "Texto",
  FACT_GRID: "Tarjetas",
  VALUES_GRID: "Valores",
  TIMELINE: "Línea de tiempo",
  STEPS: "Pasos",
  QUIZ: "Quiz",
};

// Opciones del select "Formato de visualización" (ContentForm): empiezan
// con el mismo nombre corto de la tabla, para que se reconozcan en ambos
// lugares. Ver src/lib/content-display.ts para el detalle de qué patrón de
// texto espera cada formato dentro del campo "Texto".
export const CONTENT_DISPLAY_FORMAT_LABELS: Record<ContentDisplayFormat, string> = {
  PROSE: "Texto (párrafos normales)",
  FACT_GRID: "Tarjetas (datos sueltos, siempre visibles)",
  VALUES_GRID: "Valores (tarjetas que se abren con un clic)",
  TIMELINE: "Línea de tiempo (hitos en orden)",
  STEPS: "Pasos (procedimiento numerado)",
  QUIZ: "Quiz (preguntas de opción múltiple)",
};

export const CONTENT_DISPLAY_FORMAT_HINTS: Record<ContentDisplayFormat, string> = {
  PROSE: "Cualquier texto — sin un patrón especial que respetar.",
  FACT_GRID: 'Una viñeta por hecho: "- **Título:** descripción" (o "- **Título** (Categoría): descripción" para agregar una etiqueta).',
  VALUES_GRID: 'Una línea numerada por valor: "1. **Título:** descripción".',
  TIMELINE: 'Una viñeta por hito, con el año dentro de la negrita: "- **Año — Título**: descripción".',
  STEPS: 'Una línea numerada por paso, sin negrita: "1. instrucción completa".',
  QUIZ: 'Preguntas numeradas + opciones "- texto" (la correcta en **negrita**) — usa "Insertar bloque → 🎉 Pregunta de quiz".',
};
