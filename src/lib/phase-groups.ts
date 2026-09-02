/**
 * Agrupación visual de procesos dentro de una fase (Bloque 3).
 *
 * No es un campo de esquema: se define acá como un mapeo de título → grupo
 * porque los títulos ya son estables (fijados en la migración del Bloque 1)
 * y esto evita tocar `processes` en Mongo solo para poder agruparlos en la
 * UI. Si en el futuro se necesita reordenar/renombrar grupos con
 * frecuencia, ahí sí valdría la pena moverlo a un campo real.
 *
 * El match es por sub-string sobre el título (que en Mongo lleva emoji +
 * texto, ej. "🔍 360º (Operación 360)"), así que alcanza con un fragmento
 * único del nombre "de negocio" sin repetir el emoji ni el texto completo.
 *
 * Un mismo `groupProcesses` sirve para los dos roles de Fase 04 sin
 * bifurcar por rol: cada usuario solo trae (vía findVisibleForRole) los
 * procesos de su propio rol + los COMMON, así que un proceso que no le
 * pertenece simplemente no aparece y su grupo queda vacío (se omite). Es
 * el caso de "Empalme de Duplas" (compartido entre PDM y UX/UI, ver
 * MIGRATIONS.md): cae en el grupo "Gestión de equipo" para quien lo vea,
 * sin necesitar una entrada aparte para UX/UI.
 */
export type ProcessGroupDef = { name: string; matches: string[] };

const FASE_02_GROUPS: ProcessGroupDef[] = [
  { name: "Inicio del proyecto", matches: ["Kickoff Interno", "Kickoff del Proyecto con Cliente"] },
  {
    name: "Planificación",
    matches: ["Generación de Historias de Usuario", "Definición de Hitos", "Construcción de Plan de Trabajo"],
  },
  { name: "Ritmo operativo", matches: ["Daily", "Weekly", "Levantamiento de Alertas"] },
];

/**
 * Orden pensado para que el grupo por defecto (el primero con trabajo
 * pendiente — ver defaultGroupIndex en OnboardingJourney.tsx) sea siempre
 * el punto de partida natural del rol, no "Gestión de equipo": para PDM
 * eso deja intacto Reporting → Riesgo → Gestión de equipo → Cierre; para
 * UX/UI, que no tiene Reporting/Riesgo (se filtran por estar vacíos), el
 * primero que queda es Discovery — no "Gestión de equipo", que quedó al
 * final por ser el "cierre común" de ambos roles (Empalme de Duplas, ver
 * Bloque 1).
 */
const FASE_04_GROUPS: ProcessGroupDef[] = [
  // PDM
  // "Actas de Reunión" vive acá y no en "Cierre de proyecto": su propio
  // contexto ("Inicia al terminar una reunión... dentro de las 24 horas
  // siguientes") lo describe como documentación recurrente ligada a CADA
  // reunión durante todo el proyecto, no una acción de cierre — y de paso
  // el contenido ⚠️ que tiene adentro queda más visible (primer grupo, no
  // el último). Validado contra Metologías (All).md antes de mover.
  { name: "Reporting y seguimiento", matches: ["Project Status", "360º", "NPS (Net Promoter Score)", "Pulso de Operaciones", "Actas de Reunión"] },
  { name: "Riesgo y mejora", matches: ["Matriz de Riesgo", "Planes de Mejora"] },
  // UX/UI Designer
  { name: "Discovery y planificación", matches: ["Design Interview", "Plan de Trabajo (Experiencia)", "Sitemaps"] },
  { name: "Diseño y sistema", matches: ["Lineamientos de Diseño", "UI Kit / Design System"] },
  {
    name: "Entrega y validación",
    matches: [
      "Handoff al Equipo de Desarrollo",
      "Entrega a Cliente (Diseño)",
      "Revisiones con el Cliente",
      "Revisiones con el Equipo Interno",
      "QA de Prototipo",
    ],
  },
  // Compartido — cierra el recorrido temático de ambos roles
  { name: "Gestión de equipo", matches: ["1:1 (One on One)", "Onboarding de Proyecto", "Offboarding", "Empalme de Duplas"] },
  { name: "Cierre de proyecto", matches: ["Entrega Parcial", "Entrega Final", "Manejo de Garantía"] },
];

// Keys inmutables (ver stage.repository.ts) — exportadas para que
// OnboardingJourney.tsx pueda distinguir el copy de orientación de cada
// fase sin repetir el literal.
export const FASE_02_STAGE_KEY = "modulo_3_ciclo_de_vida_del_proyecto"; // 🔄 Fase 02 · Cómo Trabajamos
export const FASE_04_STAGE_KEY = "modulo_4_tu_rol_en_imagine_apps"; // 🧭 Fase 04 · Tu Rol y Responsabilidades

const GROUPS_BY_STAGE_KEY: Record<string, ProcessGroupDef[]> = {
  [FASE_02_STAGE_KEY]: FASE_02_GROUPS,
  [FASE_04_STAGE_KEY]: FASE_04_GROUPS,
};

export type GroupedProcesses<T> = { name: string; processes: T[] };

/**
 * Agrupa `processes` según la config de la fase. Devuelve `null` cuando la
 * fase no tiene grupos definidos (Fase 01/03, de contenido corto — no hace
 * falta sobre-diseñarlas) para que el caller mantenga el render plano
 * actual sin ramas especiales.
 */
export function groupProcesses<T extends { title: string }>(stageKey: string, processes: T[]): GroupedProcesses<T>[] | null {
  const defs = GROUPS_BY_STAGE_KEY[stageKey];
  if (!defs) return null;

  const used = new Set<T>();
  const groups = defs
    .map((def) => {
      const matched = processes.filter((p) => def.matches.some((m) => p.title.includes(m)));
      matched.forEach((p) => used.add(p));
      return { name: def.name, processes: matched };
    })
    .filter((g) => g.processes.length > 0);

  // Red de seguridad: un proceso nuevo que todavía no tiene grupo asignado
  // no debe desaparecer silenciosamente de la vista.
  const leftover = processes.filter((p) => !used.has(p));
  if (leftover.length > 0) groups.push({ name: "Otros", processes: leftover });

  return groups;
}
