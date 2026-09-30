/**
 * Segunda tanda de ajustes para PDM y UX/UI Designer (ver MIGRATIONS.md #10
 * de "Migraciones de contenido"), con las respuestas del responsable del
 * producto a lo que #9 dejó pendiente:
 *
 * - En Imagine Apps no existe el rol "PM": el PDM es un híbrido entre PM y
 *   QA — toda mención a "PM"/"Project Manager" pasa a "PDM".
 * - Los agentes (Gabriela, Ginna, Claude) no se usan: se quitan, y los pasos
 *   que dependían de ellos pasan a describir el trabajo a mano.
 * - El canal oficial es Google Chat, no Slack.
 * - El PDM reporta a la Directora de Operaciones, y es Operaciones quien le da
 *   accesos y enlaces internos; a UX/UI se los gestiona el PDM de su
 *   proyecto o el equipo de Operaciones.
 *
 * Mismo motor y garantías que #9 (scripts/lib/content-patches.ts). Uso:
 *   node --env-file=.env.local --import tsx ./scripts/migrate-role-context-fixes.ts          (solo muestra el plan)
 *   node --env-file=.env.local --import tsx ./scripts/migrate-role-context-fixes.ts --apply  (escribe)
 */
import { runContentPatches, type TextPatch, type ResourceEdit } from "./lib/content-patches";

const OPERACIONES_ACCESS = " Si todavía no tienes acceso, pídeselo al equipo de Operaciones.";

const TEXT_PATCHES: TextPatch[] = [
  // ── Contexto de rol (a quién reporta / quién da accesos)
  {
    kind: "content",
    id: "6a96f9d118ef2c42bcf0909b",
    field: "body",
    label: "Tu rol como PDM — rol híbrido, a quién reporta y quién da accesos",
    from: "desde que llegan hasta que se van.",
    to: "desde que llegan hasta que se van.\n\nTu rol combina la gestión del proyecto con el aseguramiento de calidad (QA). Reportas a la **Directora de Operaciones**, y es el equipo de **Operaciones** quien te da los accesos y enlaces internos que necesites.",
  },
  {
    kind: "content",
    id: "6a96f9d218ef2c42bcf0909e",
    field: "body",
    label: "Tu rol como UX/UI — quién gestiona accesos y enlaces internos",
    from: "validando la calidad y haciendo el handoff a Dev.",
    to: "validando la calidad y haciendo el handoff a Dev.\n\nPara accesos y enlaces internos (Figma, plantillas de FigJam, checklist de QA), apóyate en el **PDM de tu proyecto** o en el equipo de **Operaciones**.",
  },

  // ── "PM" / "Project Manager" → PDM (no existe el rol PM en la empresa)
  {
    kind: "content",
    id: "6a9221019fbd163bef274abe",
    field: "body",
    label: "Política de Citas Médicas",
    from: "Acuerda con tu líder o PM cómo cubrir",
    to: "Acuerda con tu líder o con el PDM de tu proyecto cómo cubrir",
  },
  {
    kind: "content",
    id: "6a9221019fbd163bef274abc",
    field: "body",
    label: "Política de Vacaciones",
    from: "(CEO, CTO, Directora de Operaciones) o tu PM y propón",
    to: "(CEO, CTO, Directora de Operaciones) o con el PDM de tu proyecto y propón",
  },
  {
    kind: "step",
    id: "6a922230475aba441236375a",
    field: "instruction",
    label: "Project Status > Reunir los insights del equipo",
    from: "Hablar con Tech, QA, UX y PM y resumir",
    to: "Hablar con Tech, QA y UX y resumir",
  },
  {
    kind: "process",
    id: "6a92224d475aba44123637f0",
    field: "context",
    label: "Design Interview",
    from: "colaboradores: cliente y PM.",
    to: "colaboradores: cliente y PDM.",
  },
  {
    kind: "process",
    id: "6a92224f475aba44123637fc",
    field: "context",
    label: "Plan de Trabajo (Experiencia)",
    from: "compartido con el PM. Owner: Project Manager,",
    to: "compartido con el PDM. Owner: PDM,",
  },
  {
    kind: "process",
    id: "6a92225b475aba441236383e",
    field: "context",
    label: "Entrega a Cliente (Diseño)",
    from: "Owner: Project Manager;",
    to: "Owner: PDM;",
  },
  {
    kind: "process",
    id: "6a92225d475aba4412363848",
    field: "context",
    label: "Revisiones con el Cliente",
    from: "Owner: Project Manager;",
    to: "Owner: PDM;",
  },
  {
    kind: "process",
    id: "6a922260475aba4412363854",
    field: "context",
    label: "Revisiones con el Equipo Interno y de Experiencia",
    from: "equipo de Experiencia, PM, otros diseñadores",
    to: "equipo de Experiencia, PDM, otros diseñadores",
  },
  {
    kind: "process",
    id: "6a922262475aba4412363862",
    field: "context",
    label: "QA de Prototipo",
    from: "equipo de Experiencia, PM.",
    to: "equipo de Experiencia, PDM.",
  },

  // ── Slack → Google Chat
  {
    kind: "process",
    id: "6a92222f475aba4412363750",
    field: "expectedResult",
    label: "Project Status — resultado esperado",
    from: "en el canal de operaciones de Slack.",
    to: "en el canal de Operaciones de Google Chat.",
  },

  // ── Entrega Parcial: los 2 primeros pasos dependían del "Agente Claude"
  {
    kind: "step",
    id: "6a922242475aba44123637bc",
    field: "instruction",
    label: "Entrega Parcial > Extraer la información de Basecamp",
    from: "Usar el comando indicado para traer el listado actualizado de tareas.",
    to: "Revisar en Basecamp las tareas completadas en el periodo y sacar su listado actualizado.",
  },
  {
    kind: "step",
    id: "6a922243475aba44123637be",
    field: "instruction",
    label: "Entrega Parcial > Organizar la información",
    from: "Pedirle a la IA que arme una tabla con ID, tarea, estado y fecha.",
    to: "Armar una tabla con ID, tarea, estado y fecha de cada una.",
  },

  // ── Pasos que nombraban una herramienta sin decir cómo acceder
  {
    kind: "step",
    id: "6a92222f475aba4412363752",
    field: "instruction",
    label: "Project Status > Elegir el proyecto a reportar",
    from: "Entrar al selector de proyectos y confirmar que estás en el correcto.",
    to: `Entrar al selector de proyectos y confirmar que estás en el correcto.${OPERACIONES_ACCESS}`,
  },
  {
    kind: "step",
    id: "6a922233475aba4412363766",
    field: "instruction",
    label: "NPS > Registrar la respuesta",
    from: "Guardar el puntaje y los comentarios escritos en el sistema de seguimiento.",
    to: `Guardar el puntaje y los comentarios escritos en el sistema de seguimiento.${OPERACIONES_ACCESS}`,
  },
  {
    kind: "step",
    id: "6a922248475aba44123637d8",
    field: "instruction",
    label: "Manejo de Garantía > Recibir la solicitud",
    from: "Registrar el ajuste o error reportado a través del Help Desk.",
    to: `Registrar el ajuste o error reportado a través del Help Desk.${OPERACIONES_ACCESS}`,
  },
];

const RESOURCE_EDITS: ResourceEdit[] = [
  // Agentes que no se usan
  { processId: "6a92222c475aba4412363742", label: "360º", from: "Agente Gabriela", to: null },
  { processId: "6a922237475aba441236377c", label: "Planes de Mejora", from: "Agente Ginna", to: null },
  { processId: "6a92223c475aba4412363798", label: "Onboarding de Proyecto", from: "Agente Gabriela", to: null },
  { processId: "6a922242475aba44123637ba", label: "Entrega Parcial", from: "Agente Claude (extracción de Basecamp)", to: null },
  // Slack → Google Chat
  { processId: "6a92210f9fbd163bef274b10", label: "Levantamiento de Alertas", from: "Canal de Triage (Slack)", to: "Canal de Triage (Google Chat)" },
  { processId: "6a92210f9fbd163bef274b10", label: "Levantamiento de Alertas", from: "Canal de UCI (Slack)", to: "Canal de UCI (Google Chat)" },
  { processId: "6a92222f475aba4412363750", label: "Project Status", from: "Canal de Operaciones (Slack)", to: "Canal de Operaciones (Google Chat)" },
  { processId: "6a922260475aba4412363854", label: "Revisiones internas", from: "Chat interno (Slack)", to: "Chat interno (Google Chat)" },
];

runContentPatches({ textPatches: TEXT_PATCHES, resourceEdits: RESOURCE_EDITS })
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
