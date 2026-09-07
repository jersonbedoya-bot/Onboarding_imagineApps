/**
 * Reemplaza los checklists Markdown (`- [ ] paso`) de 3 content items por
 * listas numeradas (`1. paso`) — el usuario notó que en "Política de
 * Vacaciones" y "Política de Citas Médicas" se veía una casilla de
 * checklist que nunca se puede marcar (MarkdownContent.tsx la renderiza
 * como un cuadrito de solo lectura, sin `<input>` real: no hay progreso
 * por-usuario para pasos de contenido informativo, solo para
 * `process_steps`/quiz vía user_progress) — "se ve una lista y a su vez es
 * estático, no le veo sentido a esa parte".
 *
 * Se incluye también "Uso del Calendario (Timeboxing)", que tenía el mismo
 * patrón (encontrado al auditar todo el contenido con `- [ ]`, ver
 * tmp-check-policies.ts usado para la auditoría, no versionado). Los 3 son
 * pasos estrictamente secuenciales ("primero esto, después esto"), así que
 * una lista numerada comunica mejor el orden que un checklist que de
 * entrada nunca se puede tildar. Solo cambia el marcador de lista
 * (`- [ ]` → `1.`/`2.`/...) — ningún texto de instrucción se reescribió.
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
const MAGI_URL = "https://magi.imagineapps.co/login";

const PATCHES: { id: ObjectId; label: string; body: string }[] = [
  {
    id: new ObjectId("6a9221019fbd163bef274abc"), // Política de Vacaciones
    label: "Política de Vacaciones",
    body: `> **Dato clave:** puedes solicitar vacaciones una vez cumplido un (1) año laboral en Imagine Apps. La solicitud debe hacerse con mínimo un (1) mes de anticipación.

### Pasos para solicitar

1. Habla con tu líder directo (CEO, CTO, Directora de Operaciones) o tu PM y propón fechas tentativas.
2. Definan juntos las fechas exactas, asegurando que no se vean afectados entregables ni compromisos del equipo.
3. Ingresa a Magi, entra al módulo de solicitudes y registra ahí tu solicitud de vacaciones con las fechas acordadas.
4. Espera la aprobación de tu líder y de la Directora de Operaciones — la solicitud queda formalizada solo cuando ambas aprueban.

[Ir a Magi](${MAGI_URL})

### Importante

* Las vacaciones deben estar aprobadas y formalizadas antes de tomarlas; si necesitas cambiar fechas ya aprobadas, repite el proceso.
* Una vez aprobadas, actualiza tu calendario y tu estado en Gmail para el período que estarás ausente, y deja actualizado el documento de entrega de puesto.
* People lleva el registro y control de los días tomados por cada colaborador.`,
  },
  {
    id: new ObjectId("6a9221019fbd163bef274abe"), // Política de Citas Médicas
    label: "Política de Citas Médicas",
    body: `Tu salud es una prioridad.

> **Dato clave:** puedes solicitar un permiso médico avisando con al menos una (1) semana de anticipación; si la cita surge de un día para otro, coordina directamente con tu líder. El tiempo de asistencia a la cita médica no se compensa.

### Pasos

1. Escríbele a tu líder directo por Gmail indicando el día y el tiempo de ausencia.
2. Acuerda con tu líder o PM cómo cubrir tus actividades para que no se vean afectados los compromisos del equipo.
3. Agenda el espacio en tu Google Calendar, visible para todos, con el título "Permiso médico // [Tu nombre]".`,
  },
  {
    id: new ObjectId("6a9221019fbd163bef274aba"), // Uso del Calendario (Timeboxing)
    label: "Uso del Calendario (Timeboxing)",
    body: `### Timeboxing

Organiza tu Google Calendar con la metodología de Timeboxing: asignarle a cada tarea un período de tiempo fijo y limitado, en lugar de trabajar en ella hasta terminarla. Es una de las técnicas más efectivas para equipos multidisciplinarios de alta productividad.

### Configura tu calendario

1. Entra a la configuración de Google Calendar (ícono de engranaje) y ve a General → Horario Laboral y Ubicación.
2. Habilita el horario laboral, elige los días que trabajas y configura los horarios (puedes copiarlos entre días).
3. Si tu horario se interrumpe con regularidad por algo además del almuerzo, registra también ese quiebre.
4. Categoriza tu calendario por colores según el tipo de actividad o área.

> **Dato clave:** tu calendario es la bitácora real de tu trabajo diario — mantenlo actualizado.`,
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
