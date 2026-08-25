/**
 * Los repos arman patches parciales con campos opcionales explícitos
 * (`{ title: patch.title, ... }`): cuando un campo no vino en el patch,
 * su valor es `undefined`, no una key ausente. El driver de Mongo
 * serializa `undefined` como BSON null salvo `ignoreUndefined`, así que
 * un `$set` directo con esas keys pone el campo en null en vez de
 * dejarlo intacto. Filtrarlas antes de armar el `$set`.
 */
export function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}
