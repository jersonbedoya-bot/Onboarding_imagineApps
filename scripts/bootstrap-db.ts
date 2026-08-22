/**
 * Bootstrap de base de datos — crea las colecciones con sus validadores
 * $jsonSchema (defensa en profundidad detrás de Zod, ver PRD punto 7)
 * y sus índices, según la arquitectura aprobada.
 *
 * Idempotente: no falla si una colección ya existe. No modifica el
 * validador de una colección existente (eso es un collMod explícito,
 * fuera de alcance del MVP — ver "versionamiento futuro" en el PRD).
 *
 * El schema en sí vive en src/server/db/schema.ts (compartido con el
 * setup de tests de integración) — este archivo solo abre la conexión
 * y lo ejecuta.
 *
 * Uso: npm run db:bootstrap
 */
import { MongoClient } from "mongodb";
import { env } from "../src/server/config/env";
import { logger } from "../src/lib/logger";
import { DB_NAME, collections, bootstrapSchema } from "../src/server/db/schema";

async function main() {
  const client = new MongoClient(env.mongodbUri);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    await bootstrapSchema(db);
    logger.info("bootstrap_completed", { collections: collections.length });
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  logger.error("bootstrap_failed", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
