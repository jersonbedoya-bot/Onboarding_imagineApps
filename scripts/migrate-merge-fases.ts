/**
 * Migración de contenido — fusión de fases del recorrido de onboarding
 * (tenant imagine-apps), decidida en conversación con el usuario:
 *
 *   Antes (4 fases numeradas + Recursos):
 *     Fase 01 · Bienvenida y Cultura        (incluye "Principios No Negociables")
 *     Fase 02 · Cómo Trabajamos             (en realidad: Ciclo de Vida del Proyecto)
 *     Fase 03 · Tu Entorno de Trabajo       (Ecosistema Digital + Timeboxing)
 *     Fase 04 · Tu Rol y Responsabilidades  (Tu rol + procesos por rol)
 *     Recursos                              (siempre disponible, fuera del stepper)
 *
 *   Después (3 fases + Recursos):
 *     Fase 01 · Bienvenida y Cultura         (sin No Negociables)
 *     Fase 02 · Cómo Trabajamos              (No Negociables + Entorno de Trabajo)
 *     Fase 03 · Los Proyectos y Tu Rol en Ellos (Ciclo de Vida + Tu Rol, fusionados)
 *     Recursos                               (sin cambios de contenido, solo order)
 *
 * No es un cambio de schema (no toca schema.ts) — es una reasignación de
 * `stageId` sobre content_items/processes existentes + rename/reorder de
 * stages, algo que el admin panel no soporta hoy (ProcessForm solo setea
 * `stageId` al crear, ver ProcessForm.tsx). Se ejecuta una sola vez a mano
 * contra Atlas, documentado acá y en MIGRATIONS.md — no es reproducible
 * corriendo db:bootstrap/db:seed.
 *
 * Uso:
 *   npx tsx --env-file=.env.local scripts/migrate-merge-fases.ts            (dry-run, no escribe nada)
 *   npx tsx --env-file=.env.local scripts/migrate-merge-fases.ts --apply    (aplica de verdad)
 *
 * Siempre escribe antes un backup JSON de cada documento tocado en
 * scripts/.backups/merge-fases-<timestamp>.json — restaurar a mano con esos
 * datos si algo sale mal (no hay rollback automático).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { ObjectId } from "mongodb";
import { getDb } from "../src/server/db/client";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as stageService from "../src/server/services/stage.service";
import type { RequestIdentity } from "../src/server/auth/session";

const APPLY = process.argv.includes("--apply");

// IDs reales, confirmados por lectura directa de Atlas antes de escribir
// este script (ver conversación) — no vienen de scripts/data/onboarding-content.ts,
// que está desactualizado respecto a la base real (ver aviso cross-session).
const STAGE_BIENVENIDA = new ObjectId("6a921f1ccd213bc39fca4648"); // Fase 01 · Bienvenida y Cultura — sin cambios de identidad
const STAGE_ENTORNO = new ObjectId("6a9221009fbd163bef274ab6"); // hoy "Fase 03 · Tu Entorno de Trabajo" -> pasa a ser Fase 02 · Cómo Trabajamos
const STAGE_CICLO = new ObjectId("6a9221029fbd163bef274ac4"); // hoy "Fase 02 · Cómo Trabajamos" (en realidad ciclo de vida) -> se vacía y se borra
const STAGE_ROL = new ObjectId("6a922227475aba4412363724"); // hoy "Fase 04 · Tu Rol y Responsabilidades" -> pasa a ser Fase 03 · Los Proyectos y Tu Rol en Ellos
const STAGE_RECURSOS = new ObjectId("6a96dd8fc056d248eb45bbdb");

const CONTENT_NO_NEGOCIABLES = new ObjectId("6a921f1dcd213bc39fca464c");
const CONTENT_NUESTRA_HISTORIA = new ObjectId("6a973130c40ba20ab861e397");
const CONTENT_QUIENES_SOMOS_ARCHIVED = new ObjectId("6a921f1dcd213bc39fca464a");

// Los 8 procesos de ciclo de vida, en su orden actual (ver tmp-inspect-stages.ts) —
// se renumeran 1..8 al entrar a STAGE_ROL para que queden primero en el admin panel.
const CICLO_DE_VIDA_PROCESS_IDS = [
  "6a9221039fbd163bef274ac6", // Kickoff Interno (Prekickoff)
  "6a9221069fbd163bef274ad6", // Kickoff del Proyecto con Cliente
  "6a9221099fbd163bef274aea", // Generación de Historias de Usuario (HUs)
  "6a92210b9fbd163bef274af8", // Definición de Hitos
  "6a92210d9fbd163bef274b02", // Construcción de Plan de Trabajo
  "6a9221129fbd163bef274b20", // Daily
  "6a9221149fbd163bef274b2e", // Weekly
  "6a92210f9fbd163bef274b10", // Levantamiento de Alertas (Triage / UCI)
].map((id) => new ObjectId(id));

const NUEVA_HISTORIA_BODY = `### Imagine Apps nació en **2012** en Bogotá, cuando **Nicolás Rojas** y **David Lancheros** la cofundaron a los 17 años, sin capital externo — apostando todo a talento y disciplina técnica.

Lo que empezó como una idea *bootstrapped* hoy es una empresa de tecnología con presencia operativa en **Colombia** y corporativa en **Miami, EE.UU.**, que exporta talento colombiano a clientes globales.

### Nuestra visión

Ser **la primera empresa de tecnología colombiana de alcance global**.

### Nuestros valores (cinco cosas que no se nos olvidan)

1. **Empatía estratégica:** entendemos el negocio y a las personas antes de diseñar o desarrollar.
2. **Obsesión por el impacto:** no entregamos pantallas ni líneas de código, generamos valor real para el negocio del cliente.
3. **End-to-End Ownership:** nos apropiamos del producto de principio a fin.
4. **Lab Mindset:** experimentamos, probamos y aprendemos sin miedo.
5. **Inteligencia híbrida:** lo mejor de las personas y de la tecnología, human + AI.`;

async function backup(db: Awaited<ReturnType<typeof getDb>>, tenantId: ObjectId) {
  const [stages, content, processes] = await Promise.all([
    db
      .collection("onboarding_stages")
      .find({ tenantId, _id: { $in: [STAGE_BIENVENIDA, STAGE_ENTORNO, STAGE_CICLO, STAGE_ROL, STAGE_RECURSOS] } })
      .toArray(),
    db
      .collection("content_items")
      .find({ tenantId, _id: { $in: [CONTENT_NO_NEGOCIABLES, CONTENT_NUESTRA_HISTORIA, CONTENT_QUIENES_SOMOS_ARCHIVED] } })
      .toArray(),
    db.collection("processes").find({ tenantId, _id: { $in: CICLO_DE_VIDA_PROCESS_IDS } }).toArray(),
  ]);

  mkdirSync("scripts/.backups", { recursive: true });
  const path = `scripts/.backups/merge-fases-${Date.now()}.json`;
  writeFileSync(path, JSON.stringify({ stages, content, processes }, null, 2));
  console.log(`Backup escrito en ${path} (${stages.length} stages, ${content.length} content_items, ${processes.length} processes)`);
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
    console.log("Dry-run completo — revisá el plan arriba y en el mensaje de la conversación. Nada fue escrito.");
    process.exit(0);
  }

  // 1) No Negociables: Fase 01 -> Fase 02 (Entorno), al final de sus 2 items existentes.
  await db.collection("content_items").updateOne(
    { _id: CONTENT_NO_NEGOCIABLES, tenantId: tenant._id },
    { $set: { stageId: STAGE_ENTORNO, order: 3 } },
  );
  console.log("✓ No Negociables movido a stage Entorno (order 3)");

  // 2) Fusiona visión+valores (hoy en el item ARCHIVED "Quiénes Somos y Nuestra
  //    Visión") dentro de "Nuestra Historia" — el ARCHIVED no se reactiva
  //    (transición terminal), solo se recupera su texto antes de que quede huérfano.
  await db.collection("content_items").updateOne(
    { _id: CONTENT_NUESTRA_HISTORIA, tenantId: tenant._id },
    { $set: { body: NUEVA_HISTORIA_BODY } },
  );
  console.log("✓ Nuestra Historia actualizada con visión + 5 valores");

  // 3) Ciclo de vida: 8 procesos de STAGE_CICLO -> STAGE_ROL, renumerados 1..8
  //    (se corren los 24 existentes +10 para que los de ciclo de vida queden
  //    primero en el admin panel; el agrupado real en la UI lo define
  //    phase-groups.ts, no este order).
  await db.collection("processes").updateMany({ tenantId: tenant._id, stageId: STAGE_ROL }, { $inc: { order: 10 } });
  for (let i = 0; i < CICLO_DE_VIDA_PROCESS_IDS.length; i++) {
    await db.collection("processes").updateOne(
      { _id: CICLO_DE_VIDA_PROCESS_IDS[i], tenantId: tenant._id },
      { $set: { stageId: STAGE_ROL, order: i + 1 } },
    );
  }
  console.log(`✓ ${CICLO_DE_VIDA_PROCESS_IDS.length} procesos de ciclo de vida movidos a stage Rol`);

  // 4) Rename/reorder de las 3 fases sobrevivientes vía el service real
  //    (audit log + validación de dependsOnStageId incluidos gratis).
  await stageService.updateStage(actingAdmin, STAGE_ENTORNO, {
    title: "🔄 Fase 02 · Cómo Trabajamos",
    order: 2,
    dependsOnStageId: STAGE_BIENVENIDA,
  });
  await stageService.updateStage(actingAdmin, STAGE_ROL, {
    title: "🔁 Fase 03 · Los Proyectos y Tu Rol en Ellos",
    order: 3,
    dependsOnStageId: STAGE_ENTORNO,
  });
  await stageService.updateStage(actingAdmin, STAGE_RECURSOS, { order: 4 });
  console.log("✓ Fase 02 (Entorno), Fase 03 (Rol) y Recursos renombradas/reordenadas");

  // 5) Stage de ciclo de vida ya vacío (paso 3) -> archivar y borrar.
  await stageService.archiveStage(actingAdmin, STAGE_CICLO);
  await stageService.deleteStage(actingAdmin, STAGE_CICLO);
  console.log("✓ Stage de ciclo de vida (ahora vacío) archivado y borrado");

  console.log("\nMigración aplicada. Corré scripts/tmp-inspect-stages.ts para verificar el estado final.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
