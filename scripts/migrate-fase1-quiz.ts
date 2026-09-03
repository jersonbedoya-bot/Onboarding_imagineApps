/**
 * Cuarta migración de contenido (tenant imagine-apps, ver MIGRATIONS.md
 * #7/#8/#9 para las anteriores) — edición de contenido normal (body de un
 * content_item), corre por content.service.updateContentItem, no por
 * getDb() directo, así que queda en audit_logs como cualquier edición desde
 * el admin panel.
 *
 * Origen: el usuario notó que el quiz de Fase 1 ("🚀 Quiénes Somos") era
 * trivia seca (preguntas de "¿en qué ciudad/qué edad/para qué evento?")
 * mientras los de Fase 2 y Fase 3 (ver scripts/add-quiz-questions.ts) son
 * mini-escenas en 2da persona con una opción "metida de pata" — pidió
 * nivelar la diversión de Fase 1 al mismo estilo.
 *
 * Se reescriben las 5 preguntas existentes como escena + opción con gracia
 * (mismos hechos/respuesta correcta que antes, verificados contra el body
 * publicado en Atlas antes de escribir esto — no se inventó ni cambió
 * ningún dato) y se agrega una 6ª pregunta nueva sobre "Proyectos de Alto
 * Impacto", la única sección de Fase 1 que el quiz anterior no tocaba.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { ObjectId } from "mongodb";
import { getDb } from "../src/server/db/client";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as contentService from "../src/server/services/content.service";
import type { RequestIdentity } from "../src/server/auth/session";

const APPLY = process.argv.includes("--apply");

const QUIZ_ID = new ObjectId("6a98f23ad8e02afe838db9cc"); // 🎉 Pon a Prueba lo que Aprendiste (Fase 1)

const NEW_BODY = `1. Estás en una llamada con un cliente nuevo y te suelta, de pasada: "ustedes son una startup gringa, ¿cierto?". ¿Qué le respondes?
- No, somos de Miami — ahí nacimos en 2012.
- **No, nacimos en Bogotá en 2012 — hoy la sede corporativa está en Miami, pero el ADN es colombiano.**
- Sí, aunque todo el equipo técnico es colombiano.
Bogotá fue la cuna de todo esto — hoy la operación sigue ahí, con sede corporativa en Miami, EE.UU.

2. Un compañero jura en el almuerzo que Imagine Apps arrancó con una ronda de inversionistas ángeles. ¿Qué le corriges?
- Tienes razón, levantaron capital semilla antes de arrancar.
- **Nada de eso — Nicolás Rojas y David Lancheros la fundaron a los 17 años, sin un peso de capital externo.**
- Casi: fue un préstamo bancario, no inversionistas.
Todo empezó siendo adolescentes, apostando todo a talento y disciplina técnica — nada de inversionistas.

3. En el trivia de bienvenida te preguntan cuál fue el primer producto que le dio a Imagine Apps una validación masiva. Tú respondes...
- Dapta, la de inteligencia artificial.
- **MundiApp, la app que lanzamos para el Mundial FIFA Brasil 2014.**
- Feat, la plataforma B2B de restaurantes y distribuidores.
MundiApp llegó a 1 millón de usuarios en 50 países — la primera señal de que esto podía ser grande.

4. En LinkedIn alguien comenta que vio a Imagine Apps en Forbes 30 Promesas de Negocios, pero no recuerda por qué producto. Tú le cuentas que fue por...
- CasaLuker, el motor de cálculo de recetas industriales.
- **Dapta, el producto interno de IA que nació en 2023 y hoy es compañía propia.**
- Feat, la plataforma de restaurantes y distribuidores.
Dapta empezó como automatización interna y hoy es una compañía propia, graduada del acelerador 500 Global.

5. Un colega comenta que "trabajamos con hospitales gringos" y te toca adivinar cuál cliente real de Proyectos de Alto Impacto es ese.
- Feat, la plataforma de restaurantes y distribuidores.
- **Memorial Sloan Kettering Cancer Center, un centro oncológico líder en Estados Unidos.**
- Calypso del Caribe, distribución de alimentos.
Le construimos una plataforma de gestión de suministros — uno de los proyectos de salud más grandes del portafolio.

6. En tu primera semana, un compañero te reta a nombrar los 5 valores "que no se nos olvidan" — y le mete uno inventado a la lista para probarte. ¿Cuál de estos NO es un valor real?
- Lab Mindset
- **Jerarquía por antigüedad**
- End-to-End Ownership
Los 5 valores reales son Empatía estratégica, Obsesión por el impacto, End-to-End Ownership, Lab Mindset e Inteligencia híbrida — jerarquía por antigüedad no es uno de ellos.`;

async function backup(db: Awaited<ReturnType<typeof getDb>>, tenantId: ObjectId) {
  const doc = await db.collection("content_items").findOne({ tenantId, _id: QUIZ_ID });
  mkdirSync("scripts/.backups", { recursive: true });
  const path = `scripts/.backups/fase1-quiz-${Date.now()}.json`;
  writeFileSync(path, JSON.stringify({ content: doc ? [doc] : [] }, null, 2));
  console.log(`Backup escrito en ${path}`);
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

  const existing = await db.collection("content_items").findOne({ tenantId: tenant._id, _id: QUIZ_ID });
  if (!existing) throw new Error("quiz de Fase 1 no encontrado con ese _id — lo pudieron haber movido/renombrado");

  await backup(db, tenant._id);

  console.log(`\n--- "${existing.title}" (${QUIZ_ID}) ---`);
  console.log(NEW_BODY);

  if (!APPLY) {
    console.log("\nDry-run completo — revisá el plan arriba. Nada fue escrito.");
    process.exit(0);
  }

  await contentService.updateContentItem(actingAdmin, QUIZ_ID, { body: NEW_BODY });
  console.log("\n✓ Quiz de Fase 1 actualizado con preguntas en formato escena/broma, igual que Fase 2 y Fase 3.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
