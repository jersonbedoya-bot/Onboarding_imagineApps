/**
 * Migración de schema (no de contenido) — `collMod` de `users` e
 * `invitations` para ensanchar el enum de `platformRole` de ["USER",
 * "ADMIN"] a ["USER", "EDITOR", "ADMIN"] (ver MIGRATIONS.md, sección
 * "Migraciones manuales sobre Atlas", entrada nueva sobre el rol EDITOR).
 *
 * A diferencia de la migración #6 (invitación de administradores), acá NO
 * hace falta backfill: se está agregando un valor permitido al enum, no
 * agregando un campo nuevo — todo documento existente ya cumple el
 * validador ensanchado tal cual está.
 *
 * El validador que se aplica sale DIRECTO de `schema.ts` (import de
 * `collections`), nunca copiado a mano — cero riesgo de que este script y
 * la fuente de verdad del schema queden desincronizados.
 *
 * Uso: igual que las demás migraciones (dry-run por defecto, --apply para
 * escribir de verdad). No hay backup: un `collMod` de validador no toca
 * ningún documento, solo la regla de validación de la colección.
 */
import { getDb } from "../src/server/db/client";
import { collections } from "../src/server/db/schema";

const APPLY = process.argv.includes("--apply");
const TARGET_COLLECTIONS = ["users", "invitations"];

async function main() {
  console.log(APPLY ? "*** MODO APLICAR — esto escribe en Atlas ***" : "Dry-run (no escribe nada) — pasá --apply para ejecutar de verdad.");

  const db = await getDb();

  for (const name of TARGET_COLLECTIONS) {
    const def = collections.find((c) => c.name === name);
    if (!def?.validator) throw new Error(`No se encontró el validador de "${name}" en schema.ts`);

    const current = (await db.listCollections({ name }, { nameOnly: false }).next()) as { options?: { validator?: { $jsonSchema?: { properties?: { platformRole?: { enum?: string[] } } } } } } | null;
    const currentEnum = current?.options?.validator?.$jsonSchema?.properties?.platformRole?.enum ?? [];
    const nextEnum = (def.validator.$jsonSchema as { properties: { platformRole: { enum: string[] } } }).properties.platformRole.enum;

    console.log(`\n--- ${name} ---`);
    console.log(`Enum actual:  [${currentEnum.join(", ")}]`);
    console.log(`Enum nuevo:   [${nextEnum.join(", ")}]`);

    if (!APPLY) continue;

    await db.command({
      collMod: name,
      validator: def.validator,
      validationLevel: "strict",
      validationAction: "error",
    });
    console.log(`✓ collMod aplicado a "${name}"`);
  }

  console.log(APPLY ? "\nListo — aplicado." : "\nDry-run completo — revisá el plan arriba. Nada fue escrito.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
