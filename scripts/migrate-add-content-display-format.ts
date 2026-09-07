/**
 * Setea `content_items.displayFormat` explícito en los 15 content items
 * reales del tenant de desarrollo — reemplaza el mecanismo anterior de
 * "adivinar el layout por el título" (institutional-content.ts +
 * daily-life-content.ts, ambos eliminados) por un campo real que la admin
 * puede ver/editar desde el desplegable de ContentForm.tsx.
 *
 * `content_items` no tiene validador `$jsonSchema` (ver schema.ts) — no
 * hace falta ningún `collMod`, alcanza con escribir el campo vía el
 * service real (`content.service.updateContentItem`, con audit log), igual
 * que cualquier migración de contenido normal.
 *
 * Los 15 items se resuelven por TÍTULO (no por _id hardcodeado): son
 * títulos estables y únicos en este tenant, y así el script se puede leer
 * sin tener que ir a buscar cada ObjectId a mano primero.
 *
 * Uso: igual que las demás migraciones (dry-run por defecto, --apply para
 * escribir, corre por content.service.updateContentItem).
 */
import { getDb } from "../src/server/db/client";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as contentService from "../src/server/services/content.service";
import type { RequestIdentity } from "../src/server/auth/session";
import type { ContentDisplayFormat } from "../src/types/enums";

const APPLY = process.argv.includes("--apply");

const PATCHES: { title: string; displayFormat: ContentDisplayFormat }[] = [
  // 🚀 Bienvenidos a Imagine Apps
  { title: "🎯 Nuestra Historia", displayFormat: "PROSE" },
  { title: "👁️ Nuestra Visión", displayFormat: "VALUES_GRID" },
  { title: "🕰️ Hitos que nos Definieron", displayFormat: "TIMELINE" },
  { title: "🚀 Proyectos de Alto Impacto", displayFormat: "FACT_GRID" },
  { title: "🎉 Pon a Prueba lo que Aprendiste", displayFormat: "QUIZ" },
  // 🧭 Tu Día a Día en Imagine Apps
  { title: "💻 Ecosistema Digital de Trabajo", displayFormat: "FACT_GRID" },
  { title: "⚖️ Principios No Negociables", displayFormat: "FACT_GRID" },
  { title: "⏱️ Uso del Calendario (Timeboxing)", displayFormat: "STEPS" },
  { title: "🎂 Política de Cumpleaños", displayFormat: "PROSE" },
  { title: "🩺 Política de Citas Médicas", displayFormat: "PROSE" },
  { title: "🌴 Política de Vacaciones", displayFormat: "PROSE" },
  { title: "🎉 Pon a Prueba lo que Aprendiste (Tu Día a Día)", displayFormat: "QUIZ" },
  // 🔁 Tu Rol en los Proyectos
  { title: "Tu rol como PDM", displayFormat: "PROSE" },
  { title: "Tu rol como Diseñador/a UX/UI", displayFormat: "PROSE" },
  { title: "🎉 Pon a Prueba lo que Aprendiste (Ritmo de Proyecto)", displayFormat: "QUIZ" },
];

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

  console.log(`\nPlan: ${PATCHES.length} content item(s).\n`);

  for (const { title, displayFormat } of PATCHES) {
    const existing = await db.collection("content_items").findOne({ tenantId: tenant._id, title });
    if (!existing) {
      console.log(`⚠ "${title}" no encontrado — saltando.`);
      continue;
    }
    if (existing.displayFormat === displayFormat) {
      console.log(`= "${title}" ya tiene displayFormat="${displayFormat}" — sin cambios.`);
      continue;
    }
    console.log(`--- ${title} (${existing._id}) ---`);
    console.log(`displayFormat: ${existing.displayFormat ?? "(ausente)"} → ${displayFormat}`);

    if (APPLY) {
      await contentService.updateContentItem(actingAdmin, existing._id, { displayFormat });
      console.log(`✓ Actualizado`);
    }
  }

  console.log(APPLY ? "\nListo — aplicado." : "\nDry-run completo — revisá el plan arriba. Nada fue escrito.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
