const MAX_VALUE_LENGTH = 200;

/**
 * Los campos largos (body/description/instruction/...) no se guardan
 * completos en el audit log — duplicaría texto potencialmente largo por
 * cada edición, sin agregar valor real (el admin ve el contenido actual en
 * su propia pantalla, no necesita el texto viejo carácter por carácter acá,
 * solo saber QUE cambió). Cualquier otro valor (título, ids, enums,
 * booleans) se guarda tal cual: eso sí sirve para "validar cambios".
 */
function summarizeValue(value: unknown): unknown {
  if (typeof value === "string" && value.length > MAX_VALUE_LENGTH) {
    return `${value.slice(0, MAX_VALUE_LENGTH)}… (${value.length} caracteres, editado)`;
  }
  if (Array.isArray(value)) return value.map((v) => (typeof v === "object" && v !== null ? String(v) : v));
  return value;
}

/**
 * Compara `before` (documento antes de la edición) contra `patch` (solo los
 * campos que el caller efectivamente envió a actualizar) y devuelve solo los
 * que de verdad cambiaron de valor — para meterlo en `metadata` del audit
 * log de un `*_UPDATED` (ver content/stage/leader/process/step .service.ts).
 * Un campo presente en el patch pero con el mismo valor de antes no cuenta
 * como cambio real.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  patch: Partial<Record<keyof T, unknown>>,
): Record<string, { before: unknown; after: unknown }> {
  const changes: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const afterValue = patch[key];
    if (afterValue === undefined) continue; // no vino en el patch, no se tocó
    const beforeValue = before[key];
    if (JSON.stringify(beforeValue ?? null) === JSON.stringify(afterValue ?? null)) continue; // vino igual, no cambió
    changes[key as string] = { before: summarizeValue(beforeValue), after: summarizeValue(afterValue) };
  }
  return changes;
}
