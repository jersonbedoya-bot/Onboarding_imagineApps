/**
 * Segunda migración de contenido (tenant imagine-apps) — pliega "Recursos"
 * dentro de "Cómo Trabajamos" (ver MIGRATIONS.md #7 para la primera). El
 * usuario decidió que las 3 políticas de Recursos (Vacaciones, Citas
 * Médicas, Cumpleaños) pasen a ser contenido real del módulo en vez de un
 * link de salida — y que ese módulo deje de decir "Fase 02" en el título,
 * reemplazándolo por algo que describa lo que realmente contiene.
 *
 * Antes: Fase 02 · Cómo Trabajamos (No Negociables + Entorno) + Recursos
 *        como etapa aparte, siempre desbloqueada, con link en el topbar.
 * Después: 🧭 Tu Día a Día en Imagine Apps — un solo módulo con las 6 cards
 *          (No Negociables, Ecosistema, Timeboxing, Vacaciones, Citas
 *          Médicas, Cumpleaños), Recursos deja de existir como etapa.
 *
 * Trade-off aceptado a propósito: esas 3 políticas dejan de estar "siempre
 * disponibles" (antes se veían sin importar en qué fase estuvieras) — ahora
 * solo se ven mientras estás parado en este módulo. Las 3 son
 * `requirement: INFORMATIONAL`, así que este move no cambia ningún cálculo
 * de completable/bloqueo (ver totalCompletableOf en progress.service.ts).
 *
 * Uso: igual que migrate-merge-fases.ts (dry-run por defecto, --apply para
 * escribir, backup JSON automático en scripts/.backups/).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { ObjectId } from "mongodb";
import { getDb } from "../src/server/db/client";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as stageService from "../src/server/services/stage.service";
import type { RequestIdentity } from "../src/server/auth/session";

const APPLY = process.argv.includes("--apply");

const STAGE_COMO_TRABAJAMOS = new ObjectId("6a9221009fbd163bef274ab6"); // hoy "🔄 Fase 02 · Cómo Trabajamos"
const STAGE_RECURSOS = new ObjectId("6a96dd8fc056d248eb45bbdb"); // se vacía y se borra

const RECURSOS_CONTENT_IDS = [
  "6a9221019fbd163bef274abc", // 🌴 Política de Vacaciones
  "6a9221019fbd163bef274abe", // 🩺 Política de Citas Médicas
  "6a9221029fbd163bef274ac0", // 🎂 Política de Cumpleaños
].map((id) => new ObjectId(id));

const NUEVO_TITULO = "🧭 Tu Día a Día en Imagine Apps";

async function backup(db: Awaited<ReturnType<typeof getDb>>, tenantId: ObjectId) {
  const [stages, content] = await Promise.all([
    db.collection("onboarding_stages").find({ tenantId, _id: { $in: [STAGE_COMO_TRABAJAMOS, STAGE_RECURSOS] } }).toArray(),
    db.collection("content_items").find({ tenantId, _id: { $in: RECURSOS_CONTENT_IDS } }).toArray(),
  ]);
  mkdirSync("scripts/.backups", { recursive: true });
  const path = `scripts/.backups/fold-recursos-${Date.now()}.json`;
  writeFileSync(path, JSON.stringify({ stages, content }, null, 2));
  console.log(`Backup escrito en ${path} (${stages.length} stages, ${content.length} content_items)`);
}

async function main() {
  console.log(APPLY ? "*** MODO APLICAR — esto escribe en Atlas ***" : "Dry-run (no escribe nada) — pasá --apply para ejecutar de verdad.");

  const tenant = await tenantRepository.findBySlug("imagine-apps");
  if (!tenant) throw new Error("tenant not found");
  const db = await getDb();

  const admin = await db.collection("users").findOne({ tenantId: tenant._id, platformRole: "ADMIN", status: "ACTIVE" });
  if (!admin) throw new Error("no admin activo encontrado para atribuir el audit log");
  const actingAdmin: RequestIdentity = {
    userId: admin._id,
    tenantId: tenant._id,
    status: "ACTIVE",
    platformRole: "ADMIN",
    functionalRoleId: null,
  };

  await backup(db, tenant._id);

  if (!APPLY) {
    console.log("Dry-run completo — revisá el plan arriba. Nada fue escrito.");
    process.exit(0);
  }

  // 1) Las 3 políticas: Recursos -> Cómo Trabajamos, después de los 3 items existentes.
  for (let i = 0; i < RECURSOS_CONTENT_IDS.length; i++) {
    await db.collection("content_items").updateOne(
      { _id: RECURSOS_CONTENT_IDS[i], tenantId: tenant._id },
      { $set: { stageId: STAGE_COMO_TRABAJAMOS, order: 4 + i } },
    );
  }
  console.log(`✓ ${RECURSOS_CONTENT_IDS.length} políticas movidas a Cómo Trabajamos (order 4-6)`);

  // 2) Rename (sin "Fase 02") vía el service real — audit log incluido.
  await stageService.updateStage(actingAdmin, STAGE_COMO_TRABAJAMOS, { title: NUEVO_TITULO });
  console.log(`✓ Módulo renombrado a "${NUEVO_TITULO}"`);

  // 3) Recursos ya vacío -> archivar y borrar.
  await stageService.archiveStage(actingAdmin, STAGE_RECURSOS);
  await stageService.deleteStage(actingAdmin, STAGE_RECURSOS);
  console.log("✓ Stage de Recursos (ahora vacío) archivado y borrado");

  console.log("\nMigración aplicada.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
