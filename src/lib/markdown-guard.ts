/**
 * Heurística para avisarle a un admin sin acceso al código que una edición
 * sobre un campo Markdown (ver MarkdownTextarea.tsx) parece haber borrado
 * sin querer una negrita o un enlace que el texto ya tenía. Varias cards
 * llevan **prefijos en negrita** (ej. "**PDM:**") o [links](url) insertados
 * a mano vía migraciones de contenido (ver MIGRATIONS.md) — una vez
 * guardado, texto formateado y texto plano son indistinguibles para el
 * validador (Zod solo pide `string`), así que no hay otra red de contención
 * que avisar ANTES de guardar.
 *
 * Cuenta ocurrencias, no valida sintaxis balanceada — alcanza para el caso
 * real (se borra un `*` o un `[`/`]`/`(`/`)` al corregir una frase) sin
 * construir un parser Markdown propio para esto. Falsos positivos posibles
 * (ej. el admin de verdad quería borrar ese texto) — por eso es un aviso
 * con opción de "guardar igual", nunca un bloqueo.
 */
function countMarkdownEmphasis(text: string) {
  const bold = (text.match(/\*\*[^*]+\*\*/g) ?? []).length;
  const links = (text.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
  return { bold, links };
}

export type MarkdownGuardField = { label: string; before: string; after: string };

/** Etiquetas de los campos donde `after` tiene menos negritas o enlaces que `before` — [] si ninguno perdió formato. */
export function fieldsThatLostFormatting(fields: MarkdownGuardField[]): string[] {
  return fields
    .filter(({ before, after }) => {
      const b = countMarkdownEmphasis(before);
      const a = countMarkdownEmphasis(after);
      return a.bold < b.bold || a.links < b.links;
    })
    .map((field) => field.label);
}
