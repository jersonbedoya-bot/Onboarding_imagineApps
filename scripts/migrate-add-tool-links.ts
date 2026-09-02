/**
 * Tercera migración de contenido (tenant imagine-apps, ver MIGRATIONS.md
 * #7/#8 para las anteriores) — a diferencia de esas, esta NO reasigna
 * `stageId` ni toca estructura de etapas: son ediciones de contenido
 * normales (título/body/objective/context/expectedResult/resources de
 * content_items, processes y process_steps), así que corre por los
 * *.service.ts reales (updateContentItem/updateProcess/updateStep), no por
 * getDb() directo — quedan en audit_logs como cualquier edición desde el
 * admin panel.
 *
 * Origen: pedido del usuario de (a) agregar links reales a herramientas
 * mencionadas como texto plano (Basecamp, Google Drive, Magi para
 * Daily/Weekly) usando las URLs reales encontradas en "Metologías (All).md",
 * y (b) remover toda mención de "Agents Hub" (decisión de producto: ya no
 * se usa) — sin reemplazarlo por otra herramienta, según confirmó el
 * usuario ("Gimena hace parte de Agents Hub, eso ya no va en el onboarding").
 *
 * Decisiones confirmadas con el usuario antes de escribir esto:
 * - Magi: https://magi.imagineapps.co/login (no estaba en el documento).
 * - Gimena/Agents Hub: se remueve, no se reemplaza por otro link.
 * - Google Drive: link genérico a drive.google.com (el único link del
 *   documento era la carpeta de un proyecto puntual, no un punto de
 *   entrada general).
 *
 * Uso: igual que las migraciones anteriores (dry-run por defecto, --apply
 * para escribir, backup JSON automático en scripts/.backups/).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { ObjectId } from "mongodb";
import { getDb } from "../src/server/db/client";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as contentService from "../src/server/services/content.service";
import * as processService from "../src/server/services/process.service";
import * as stepService from "../src/server/services/step.service";
import type { RequestIdentity } from "../src/server/auth/session";

const APPLY = process.argv.includes("--apply");

const BASECAMP_URL = "https://3.basecamp.com/5172885/projects";
const DRIVE_URL = "https://drive.google.com";
const MAGI_URL = "https://magi.imagineapps.co/login";

const ECOSISTEMA_DIGITAL_ID = new ObjectId("6a9221009fbd163bef274ab8");
const NUEVO_ECOSISTEMA_BODY = `### Herramientas del día a día

* **[Basecamp](${BASECAMP_URL}):** gestión de proyectos, hilos de discusión y asignación de tareas con clientes y equipos.
* **Google Chat y Gmail:** canales oficiales de comunicación sincrónica y asincrónica.
* **[Google Drive](${DRIVE_URL}):** carpetas de proyecto con los entregables internos y externos.
* **[Magi](${MAGI_URL}):** diligenciamiento del Daily y del Weekly.
* **Figma:** diseño y prototipado.

### Contacto de contingencia

> **Dato clave:** guardá ya en tu celular el número de Kelly Yohana Ospina (People): **314 860 0139**. Ante una emergencia operativa, People intentará contactarte por teléfono — si no tenés el número guardado, los filtros de spam pueden bloquear la llamada.`;

const PROCESS_PATCHES: { id: ObjectId; label: string; patch: Parameters<typeof processService.updateProcess>[2] }[] = [
  {
    id: new ObjectId("6a9221039fbd163bef274ac6"), // Kickoff Interno
    label: "Kickoff Interno (Prekickoff)",
    patch: {
      expectedResult: `Equipo alineado y asignado en [Basecamp](${BASECAMP_URL}), presentación de kickoff lista para el cliente, listado de preguntas clave y definición preliminar de la arquitectura.`,
    },
  },
  {
    id: new ObjectId("6a9221099fbd163bef274aea"), // Generación de HUs
    label: "Generación de Historias de Usuario (HUs)",
    patch: {
      context: `Inicia cuando el cliente o el equipo define una nueva funcionalidad y termina cuando la HU está registrada en [Basecamp](${BASECAMP_URL}) como parte del plan de trabajo. Owner: PDM en colaboración con el Tech Lead.`,
      expectedResult: `Historia de usuario con criterios de aceptación medibles, registrada y priorizada en [Basecamp](${BASECAMP_URL}).`,
      // Gimena vivía envuelta en "Agents Hub" — ya no va en el onboarding
      // (confirmado con el usuario), sin reemplazo por otra herramienta.
      resources: ["Figma"],
    },
  },
  {
    id: new ObjectId("6a92210d9fbd163bef274b02"), // Construcción de Plan de Trabajo
    label: "Construcción de Plan de Trabajo",
    patch: {
      expectedResult: `Cronograma definido, matriz de riesgos actualizada, registro de cambios, diagrama de Gantt, [Basecamp](${BASECAMP_URL}) estructurado e historias de usuario listas para desarrollo.`,
    },
  },
  {
    id: new ObjectId("6a9221129fbd163bef274b20"), // Daily
    label: "Daily",
    patch: {
      expectedResult: `Hilo con el plan de trabajo adaptado, registro de bloqueos en gestión, y el Daily diligenciado en [Magi](${MAGI_URL}).`,
    },
  },
  {
    id: new ObjectId("6a9221149fbd163bef274b2e"), // Weekly
    label: "Weekly",
    patch: {
      expectedResult: `Hilo estructurado en Google Chat con el mapeo semanal de objetivos y su estado de cumplimiento actualizado al jueves, y el Weekly diligenciado en [Magi](${MAGI_URL}).`,
    },
  },
  {
    id: new ObjectId("6a922227475aba4412363726"), // Actas de Reunión
    label: "Actas de Reunión",
    patch: {
      // "Agents Hub (Acta IA)" era la única herramienta listada — se remueve
      // sin reemplazo (mismo criterio que HUs).
      resources: [],
    },
  },
];

const STEP_PATCHES: { id: ObjectId; label: string; patch: Parameters<typeof stepService.updateStep>[2] }[] = [
  {
    id: new ObjectId("6a9221049fbd163bef274ace"), // Kickoff Interno > Habilitar el ecosistema de trabajo
    label: "Habilitar el ecosistema de trabajo",
    patch: { instruction: `Crear el canal del proyecto en Google Suite y el espacio de trabajo en [Basecamp](${BASECAMP_URL}).` },
  },
  {
    id: new ObjectId("6a9221089fbd163bef274ae4"), // Kickoff Cliente > Centralizar la comunicación
    label: "Centralizar la comunicación",
    patch: { instruction: `Definir la herramienta oficial ([Basecamp](${BASECAMP_URL}) o Google Chat) para evitar dispersión de información.` },
  },
  {
    id: new ObjectId("6a92210a9fbd163bef274aee"), // HUs > "Invocar a Gimena" -> genérico, sin Agents Hub
    label: "Invocar a Gimena → Redactar la historia de usuario",
    patch: {
      title: "Redactar la historia de usuario",
      instruction: "Redactar la historia de usuario con su contexto y criterios de aceptación, siguiendo el formato estándar del equipo.",
    },
  },
  {
    id: new ObjectId("6a92210f9fbd163bef274b0e"), // Plan de Trabajo > Consolidar el plan
    label: "Consolidar el plan",
    patch: {
      instruction: `Completar el desglose de tareas en un máximo de dos semanas desde el inicio del proyecto, registrando las historias en [Basecamp](${BASECAMP_URL}).`,
    },
  },
  {
    id: new ObjectId("6a922228475aba4412363728"), // Actas de Reunión > Cargar el contenido -> sin Agents Hub
    label: "Cargar el contenido",
    patch: {
      instruction: "Redactar el acta con las decisiones y compromisos de la reunión, y compartirla por correo con los participantes dentro de las 24 horas siguientes.",
    },
  },
  {
    id: new ObjectId("6a92225f475aba4412363850"), // Revisiones con el Cliente > Recoger feedback
    label: "Recoger feedback",
    patch: { instruction: `Resolver dudas en tiempo real y documentar todos los comentarios recibidos, en vivo o por [Basecamp](${BASECAMP_URL}).` },
  },
];

async function backup(db: Awaited<ReturnType<typeof getDb>>, tenantId: ObjectId) {
  const [content, processes, steps] = await Promise.all([
    db.collection("content_items").find({ tenantId, _id: ECOSISTEMA_DIGITAL_ID }).toArray(),
    db.collection("processes").find({ tenantId, _id: { $in: PROCESS_PATCHES.map((p) => p.id) } }).toArray(),
    db.collection("process_steps").find({ tenantId, _id: { $in: STEP_PATCHES.map((s) => s.id) } }).toArray(),
  ]);
  mkdirSync("scripts/.backups", { recursive: true });
  const path = `scripts/.backups/add-tool-links-${Date.now()}.json`;
  writeFileSync(path, JSON.stringify({ content, processes, steps }, null, 2));
  console.log(`Backup escrito en ${path} (${content.length} content_items, ${processes.length} processes, ${steps.length} steps)`);
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
    console.log(`\nPlan: 1 content_item, ${PROCESS_PATCHES.length} processes, ${STEP_PATCHES.length} steps.`);
    console.log("Dry-run completo — revisá el plan arriba. Nada fue escrito.");
    process.exit(0);
  }

  await contentService.updateContentItem(actingAdmin, ECOSISTEMA_DIGITAL_ID, { body: NUEVO_ECOSISTEMA_BODY });
  console.log('✓ "Ecosistema Digital de Trabajo" actualizado (Basecamp/Drive linkeados, Magi agregado, Agents Hub removido)');

  for (const { id, label, patch } of PROCESS_PATCHES) {
    await processService.updateProcess(actingAdmin, id, patch);
    console.log(`✓ Proceso actualizado: ${label}`);
  }

  for (const { id, label, patch } of STEP_PATCHES) {
    await stepService.updateStep(actingAdmin, id, patch);
    console.log(`✓ Paso actualizado: ${label}`);
  }

  console.log("\nMigración aplicada.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
