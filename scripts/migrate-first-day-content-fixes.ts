/**
 * Ajustes de contenido que ven PDM y UX/UI Designer, salidos de la revisión
 * de "primer día" (orquestación de agentes, ver MIGRATIONS.md #9 de
 * "Migraciones de contenido"). Solo incluye cambios que se sostienen en el
 * propio contenido o en decisiones ya tomadas; lo que depende de confirmar
 * con Operaciones/Experiencia (Slack vs Google Chat, agentes Gabriela/Ginna/
 * Claude, quién es "PM", links internos de Figma) NO está acá.
 *
 * Seguro para correr sobre una base que ya cambió: cada reemplazo de texto
 * exige encontrar el texto viejo exacto — si no está (alguien ya lo editó
 * desde el panel), se informa y se salta, nunca se pisa a ciegas. Correrlo
 * dos veces no rompe nada (la segunda vez todo sale "ya aplicado").
 *
 * Uso:
 *   node --env-file=.env.local --import tsx ./scripts/migrate-first-day-content-fixes.ts          (solo muestra el plan)
 *   node --env-file=.env.local --import tsx ./scripts/migrate-first-day-content-fixes.ts --apply  (escribe)
 * OJO: .env.local apunta a la base que tenga configurada — hoy es el mismo
 * Atlas de producción. Todo pasa por los services reales (auditoría incluida).
 */
import { runContentPatches, type TextPatch, type ResourceEdit, type Reorder } from "./lib/content-patches";

const TEXT_PATCHES: TextPatch[] = [
  // ── Intro de rol: los grupos que dice no coincidían con las pestañas reales
  {
    kind: "content",
    id: "6a96f9d118ef2c42bcf0909b",
    field: "body",
    label: "Tu rol como PDM — concordancia de género de los grupos",
    from: "3 propias de tu rol y **Gestión de equipo**, compartida con UX/UI",
    to: "3 propios de tu rol y **Gestión de equipo**, compartido con UX/UI",
  },
  {
    kind: "content",
    id: "6a96f9d218ef2c42bcf0909e",
    field: "body",
    label: "Tu rol como UX/UI — son 6 grupos (2 comunes), no 7",
    from: "organizados en 7 grupos: 3 comunes a todo proyecto, 3 propias de tu rol y **Gestión de equipo**, compartida con PDM",
    to: "organizados en 6 grupos: 2 comunes a todo proyecto, 3 propios de tu rol y **Gestión de equipo**, compartido con PDM",
  },
  {
    kind: "content",
    id: "6a96f9d218ef2c42bcf0909e",
    field: "body",
    label: "Tu rol como UX/UI — redacción de la primera frase",
    from: "Como **Diseñador/a UX/UI** tu trabajo entiende el negocio y a las personas antes de diseñar, y no termina",
    to: "Como **Diseñador/a UX/UI** entiendes el negocio y a las personas antes de diseñar, y tu trabajo no termina",
  },

  // ── Cumpleaños: el plazo aparecía como "15 días hábiles", "15 días" y "2 semanas"
  {
    kind: "content",
    id: "6a9221029fbd163bef274ac0",
    field: "body",
    label: "Política de Cumpleaños — plazo del dato clave",
    from: "dentro de los 15 días siguientes. Este permiso",
    to: "dentro de los 15 días hábiles siguientes. Este permiso",
  },
  {
    kind: "content",
    id: "6a9221029fbd163bef274ac0",
    field: "body",
    label: "Política de Cumpleaños — \"área\" → líder directo",
    from: "necesita la aprobación de tu líder de área",
    to: "necesita la aprobación de tu líder directo",
  },
  {
    kind: "content",
    id: "6a98f23bd8e02afe838db9cf",
    field: "body",
    label: "Quiz Tu Día a Día — opción correcta de cumpleaños",
    from: "**No — puedes tomarlo cualquier día hábil dentro de los 15 días siguientes.**",
    to: "**No — puedes tomarlo dentro de los 15 días hábiles siguientes.**",
  },
  {
    kind: "content",
    id: "6a98f23bd8e02afe838db9cf",
    field: "body",
    label: "Quiz Tu Día a Día — explicación de cumpleaños",
    from: "tienes esas 2 semanas de margen",
    to: "tienes esos 15 días hábiles de margen",
  },

  // ── "área" → "equipo"/"proyecto" (terminología del producto)
  {
    kind: "content",
    id: "6a9221019fbd163bef274aba",
    field: "body",
    label: "Timeboxing — categorías del calendario",
    from: "según el tipo de actividad o área",
    to: "según el tipo de actividad o proyecto",
  },
  {
    kind: "process",
    id: "6a92222f475aba4412363750",
    field: "context",
    label: "Project Status — contexto",
    from: "de cada líder de área",
    to: "de cada líder de equipo",
  },
  {
    kind: "process",
    id: "6a922239475aba441236378c",
    field: "context",
    label: "1:1 — owner",
    from: "(CXO, líder de área, PDM)",
    to: "(CXO, líder de equipo, PDM)",
  },

  // ── Kickoff Interno: "se suma recién" chocaba con el paso 5, donde UX/UI ya recibe accesos
  {
    kind: "process",
    id: "6a9221039fbd163bef274ac6",
    field: "context",
    label: "Kickoff Interno — cuándo entra UX/UI",
    from: "UX/UI Designer se suma recién en la sesión de alineación (último paso), para conocer el alcance antes de arrancar su parte del proyecto.",
    to: "UX/UI Designer recibe los accesos en el paso «Activar al equipo» y participa desde la sesión de alineación (último paso), donde conoce el alcance antes de arrancar su parte del proyecto.",
  },

  // ── Agentes de Agents Hub ya dados de baja (ver MIGRATIONS.md #3)
  {
    kind: "step",
    id: "6a92210e9fbd163bef274b08",
    field: "instruction",
    label: "Plan de Trabajo > Crear las historias de usuario — quitar Gimena",
    from: "Construir las HU de cada tarea del cronograma con ayuda de Gimena.",
    to: "Construir las HU de cada tarea del cronograma.",
  },

  // ── Actas de Reunión: el paso 2 y el 3 pedían lo mismo ("revísalo")
  {
    kind: "step",
    id: "6a922228475aba441236372a",
    field: "instruction",
    label: "Actas de Reunión > paso 2 — solo describe el borrador automático",
    from: "genera un borrador del acta automáticamente al mediodía y a las 6 p.m. Ábrelo y revísalo antes de continuar.",
    to: "genera un borrador del acta automáticamente al mediodía y a las 6 p.m.",
  },
  {
    kind: "step",
    id: "6a922228475aba441236372a",
    field: "title",
    label: "Actas de Reunión > paso 2 — título",
    from: "Revisar el borrador generado",
    to: "Recibir el borrador automático",
  },
];

// HUs: "Redactar la historia de usuario" resumía los 2 pasos siguientes
// (formato + criterios de aceptación). Se archiva, no se borra: quien ya lo
// había completado conserva su registro de progreso.
const STEPS_TO_ARCHIVE: { id: string; label: string }[] = [
  { id: "6a92210a9fbd163bef274aee", label: "HUs > Redactar la historia de usuario (duplicado de los pasos 3 y 4)" },
];

const RESOURCE_EDITS: ResourceEdit[] = [
  { processId: "6a92224f475aba44123637fc", label: "Plan de Trabajo (Experiencia)", from: "Gabo (Planner)", to: null },
];

// "Entrega y validación" (UX/UI) aparecía al revés: empezaba en el Handoff
// y terminaba en QA. Se reparten entre estos 5 los mismos valores de
// `order` que ya tenían, así no se mueven respecto del resto del módulo.
const UX_DELIVERY_ORDER: Reorder["processes"] = [
  { id: "6a922262475aba4412363862", label: "QA de Prototipo" },
  { id: "6a922260475aba4412363854", label: "Revisiones con el Equipo Interno y de Experiencia" },
  { id: "6a92225d475aba4412363848", label: "Revisiones con el Cliente" },
  { id: "6a922259475aba4412363832", label: "Handoff al Equipo de Desarrollo" },
  { id: "6a92225b475aba441236383e", label: "Entrega a Cliente (Diseño)" },
];

// El segundo valor es el que quedó editado a mano desde el panel (sin tilde).
const BLOCKED_MESSAGE_FROM = ["Completa lo pendiente de esta etapa para avanzar.", "Completa lo pendiente de este modulo para avanzar."];
const BLOCKED_MESSAGE_TO = "Completa lo pendiente de este módulo para avanzar.";

runContentPatches({
  textPatches: TEXT_PATCHES,
  stepsToArchive: STEPS_TO_ARCHIVE,
  resourceEdits: RESOURCE_EDITS,
  reorders: [{ label: "Entrega y validación (UX/UI)", processes: UX_DELIVERY_ORDER }],
  blockedMessage: { from: BLOCKED_MESSAGE_FROM, to: BLOCKED_MESSAGE_TO },
})
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
