/**
 * Simplifica el segundo párrafo de "Tu rol como PDM" / "Tu rol como
 * Diseñador/a UX/UI" (content_items scope ROLE, stage "Los Proyectos y Tu
 * Rol en Ellos") — el usuario señaló que enumerar los 7 nombres de grupo
 * en una sola oración con paréntesis anidados era confuso, y encima
 * redundante: esos mismos 7 nombres ya se ven como pastillas clicables
 * justo debajo (ProcessGroupNav). Se saca la lista de nombres, se deja
 * solo la estructura (3 comunes + 3 propias + 1 compartida).
 *
 * De paso corrige una inconsistencia real encontrada al revisar: la copy
 * de PDM metía "Gestión de equipo" dentro de "4 propias de tu rol", pero
 * ese grupo es compartido con UX/UI (mismo grupo, mismos procesos —
 * "Empalme de Duplas" — ver phase-groups.ts) tal como sí lo aclaraba la
 * propia copy de UX/UI. Con este cambio ambos textos quedan simétricos:
 * 3 comunes + 3 propias + 1 compartida = 7, para los dos roles.
 *
 * Uso: igual que las demás migraciones de contenido (dry-run por defecto,
 * --apply para escribir, corre por content.service.updateContentItem).
 */
import { ObjectId } from "mongodb";
import { getDb } from "../src/server/db/client";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as contentService from "../src/server/services/content.service";
import type { RequestIdentity } from "../src/server/auth/session";

const APPLY = process.argv.includes("--apply");

const PATCHES: { id: ObjectId; label: string; body: string }[] = [
  {
    id: new ObjectId("6a96f9d118ef2c42bcf0909b"), // Tu rol como PDM
    label: "Tu rol como PDM",
    body: `Como **PDM** sostienes el proyecto de punta a punta: gestionas el producto y el backlog, coordinas al equipo interno y eres el puente de comunicación con el cliente. Facilitas el ritmo operativo (kickoffs, dailies, weeklies) y le das seguimiento constante al proyecto a través de reportes, gestión de riesgos y la gestión de las personas de tu equipo — desde que llegan hasta que se van.

A continuación vas a encontrar esos procesos organizados en 7 grupos: 3 comunes a todo proyecto, 3 propias de tu rol y **Gestión de equipo**, compartida con UX/UI para el empalme de duplas. Elige un grupo para ver sus procesos.`,
  },
  {
    id: new ObjectId("6a96f9d218ef2c42bcf0909e"), // Tu rol como Diseñador/a UX/UI
    label: "Tu rol como Diseñador/a UX/UI",
    body: `Como **Diseñador/a UX/UI** tu trabajo entiende el negocio y a las personas antes de diseñar, y no termina hasta que la solución le llega bien documentada al equipo de desarrollo. Vas desde la investigación con el cliente (entrevistas, plan de trabajo, sitemaps) hasta construir el sistema de diseño, y cierras cada proyecto validando la calidad y haciendo el handoff a Dev.

A continuación vas a encontrar esos procesos organizados en 7 grupos: 3 comunes a todo proyecto, 3 propias de tu rol y **Gestión de equipo**, compartida con PDM para el empalme de duplas. Elige un grupo para ver sus procesos.`,
  },
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

  for (const patch of PATCHES) {
    const existing = await db.collection("content_items").findOne({ tenantId: tenant._id, _id: patch.id });
    if (!existing) {
      console.log(`⚠ "${patch.label}" no encontrado con ese _id — saltando.`);
      continue;
    }
    console.log(`\n--- ${patch.label} (${patch.id}) ---`);
    console.log(patch.body);

    if (!APPLY) continue;
    await contentService.updateContentItem(actingAdmin, patch.id, { body: patch.body });
    console.log(`✓ Actualizado`);
  }

  console.log(APPLY ? "\nListo — aplicado." : "\nDry-run completo — revisá el plan arriba. Nada fue escrito.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
