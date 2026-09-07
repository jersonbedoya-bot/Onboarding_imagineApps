/**
 * Aclara quién hace qué (PDM vs UX/UI Designer) en los pasos de los 2
 * procesos de Kickoff (COMMON, ver MIGRATIONS.md #3) — pedido explícito
 * del usuario: compartir la misma card entre ambos roles sin decir qué
 * corresponde a cada uno era confuso, sobre todo porque `process_steps`
 * no tiene `scope`/`roleIds` propio (a diferencia de content_items/
 * processes/leaders) — no se puede mostrar pasos distintos por rol sin
 * una migración de schema, así que la aclaración va DENTRO del texto de
 * cada paso, con un prefijo en negrita consistente (**PDM:** /
 * **PDM y UX/UI:**), en vez de tocar el modelo de datos para esto.
 *
 * El reparto (quién lidera cada paso) es un borrador que el usuario
 * confirmó explícitamente antes de aplicar esto — no se inventó sin
 * chequear: la mayoría de los pasos de logística/contrato/cronograma
 * quedan PDM-only, y los pasos donde UX/UI necesita el alcance para
 * dimensionar research/diseño (o aportar riesgos propios de UX) quedan
 * marcados como compartidos.
 *
 * También ajusta el `context` de Kickoff Interno para aclarar en qué
 * momento se suma UX/UI (no lo hace desde el paso 1, se suma recién en la
 * sesión de alineación) — el de Kickoff Cliente no se tocó, ya hablaba de
 * "el equipo de Imagine" en general, sin implicar que es solo PDM.
 *
 * Uso: igual que las demás migraciones de contenido (dry-run por defecto,
 * --apply para escribir, corre por process.service/step.service reales).
 */
import { ObjectId } from "mongodb";
import { getDb } from "../src/server/db/client";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as processService from "../src/server/services/process.service";
import * as stepService from "../src/server/services/step.service";
import type { RequestIdentity } from "../src/server/auth/session";

const APPLY = process.argv.includes("--apply");
const BASECAMP_URL = "https://3.basecamp.com/5172885/projects";

const PROCESS_PATCHES: { id: ObjectId; label: string; context: string }[] = [
  {
    id: new ObjectId("6a9221039fbd163bef274ac6"), // Kickoff Interno
    label: "Kickoff Interno (Prekickoff)",
    context:
      "Inicia cuando se recibe la confirmación de cierre comercial (contrato firmado y anticipo recibido) y termina con la ejecución del kickoff interno y la alineación completa del equipo. Owner: PDM, en colaboración con el equipo comercial y el equipo asignado — UX/UI Designer se suma recién en la sesión de alineación (último paso), para conocer el alcance antes de arrancar su parte del proyecto.",
  },
];

const STEP_PATCHES: { id: ObjectId; label: string; instruction: string }[] = [
  // Kickoff Interno
  { id: new ObjectId("6a9221039fbd163bef274ac8"), label: "Recibir el proyecto", instruction: "**PDM:** Monitorear el canal de cierre comercial y tomar el caso cuando se comparta el contexto inicial." },
  { id: new ObjectId("6a9221049fbd163bef274aca"), label: "Validar condiciones de inicio", instruction: "**PDM:** Confirmar que el contrato esté firmado, el anticipo recibido y el 'GO' de gerencia esté en regla." },
  { id: new ObjectId("6a9221049fbd163bef274acc"), label: "Construir la base del proyecto", instruction: "**PDM:** Crear la carpeta del proyecto en Drive y solicitar a comercial el documento de planeación." },
  { id: new ObjectId("6a9221049fbd163bef274ace"), label: "Habilitar el ecosistema de trabajo", instruction: `**PDM:** Crear el canal del proyecto en Google Suite y el espacio de trabajo en [Basecamp](${BASECAMP_URL}).` },
  { id: new ObjectId("6a9221059fbd163bef274ad0"), label: "Activar al equipo", instruction: "**PDM:** Enviar el mensaje de apertura con el documento de pre kickoff, la carpeta del proyecto y los accesos, agregando a todos los participantes del proyecto — incluido UX/UI." },
  { id: new ObjectId("6a9221059fbd163bef274ad2"), label: "Agendar el kickoff interno", instruction: "**PDM:** Programar la sesión asegurando que ocurra antes del kickoff con el cliente." },
  { id: new ObjectId("6a9221059fbd163bef274ad4"), label: "Ejecutar la alineación interna", instruction: "**PDM y UX/UI:** Realizar la sesión de kickoff interno resolviendo dudas técnicas y de alcance con los insumos previos. UX/UI usa este espacio para entender el alcance y dimensionar su parte de research/diseño." },
  // Kickoff con Cliente
  { id: new ObjectId("6a9221069fbd163bef274ad8"), label: "Presentar al equipo multidisciplinario", instruction: "**PDM y UX/UI:** Definir roles y quién será el punto de contacto principal para el cliente — cada quien se presenta y explica su parte en el proyecto." },
  { id: new ObjectId("6a9221069fbd163bef274ada"), label: "Contextualizar el negocio", instruction: "**PDM y UX/UI:** Escuchar la trayectoria de la empresa y sus cuellos de botella actuales. UX/UI presta especial atención a las necesidades de usuario y al contexto relevante para research." },
  { id: new ObjectId("6a9221079fbd163bef274adc"), label: "Definir el alcance técnico", instruction: "**PDM:** Desglosar el proyecto en etapas claras. **UX/UI:** aporta el alcance específico de investigación y diseño dentro de esas etapas." },
  { id: new ObjectId("6a9221079fbd163bef274ade"), label: "Establecer hitos y cronograma", instruction: "**PDM:** Fijar fechas de inicio y entrega final, aclarando qué se considera un hito cumplido. **UX/UI:** valida que haya tiempo contemplado para research, wireframes y validación con usuarios." },
  { id: new ObjectId("6a9221079fbd163bef274ae0"), label: "Acordar el protocolo de aprobación", instruction: "**PDM:** Establecer tiempos de respuesta máximos (ej. 3 días hábiles) para evitar bloqueos." },
  { id: new ObjectId("6a9221089fbd163bef274ae2"), label: "Identificar riesgos y mitigaciones", instruction: "**PDM y UX/UI:** Mapear posibles retrasos por falta de información o limitaciones técnicas de terceros — UX/UI suma los riesgos propios de research y validación con usuarios." },
  { id: new ObjectId("6a9221089fbd163bef274ae4"), label: "Centralizar la comunicación", instruction: `**PDM:** Definir la herramienta oficial ([Basecamp](${BASECAMP_URL}) o Google Chat) para evitar dispersión de información.` },
  { id: new ObjectId("6a9221089fbd163bef274ae6"), label: "Agendar seguimientos recurrentes", instruction: "**PDM:** Fijar un día y hora fija a la semana para revisar avances." },
  { id: new ObjectId("6a9221099fbd163bef274ae8"), label: "Solicitar insumos inmediatos", instruction: "**PDM:** Pedir accesos a repositorios, bases de datos históricas o archivos maestros de operación. **UX/UI:** pedir además brand guidelines e investigaciones de usuario previas, si existen." },
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

  console.log(`\nPlan: ${PROCESS_PATCHES.length} proceso(s), ${STEP_PATCHES.length} paso(s).\n`);

  for (const { id, label, context } of PROCESS_PATCHES) {
    console.log(`--- Proceso: ${label} ---`);
    console.log(context, "\n");
    if (APPLY) {
      await processService.updateProcess(actingAdmin, id, { context });
      console.log(`✓ Actualizado\n`);
    }
  }

  for (const { id, label, instruction } of STEP_PATCHES) {
    console.log(`--- Paso: ${label} ---`);
    console.log(instruction, "\n");
    if (APPLY) {
      await stepService.updateStep(actingAdmin, id, { instruction });
      console.log(`✓ Actualizado\n`);
    }
  }

  console.log(APPLY ? "Listo — aplicado." : "Dry-run completo — revisá el plan arriba. Nada fue escrito.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
