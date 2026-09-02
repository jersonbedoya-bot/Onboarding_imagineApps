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
// `icon` es puramente decorativo (mismo criterio que `name`: config de
// código, no dato de admin) — inspirado en el pipeline de fases de
// imagine-apps-onboarding/paso-2-ciclo-de-vida.html (mockup estático, ver
// BACKLOG.md respecto al simulador tipo quiz de esa misma referencia, que
// NO se adoptó).
export type ProcessGroupDef = { name: string; icon: string; matches: string[] };

/**
 * Fusión de contenido (migración de fases, ver MIGRATIONS.md): esta fase
 * mostraba antes el ciclo de vida del proyecto y "Tu Rol" por separado en
 * dos etapas distintas — se unificaron en una sola ("Los Proyectos y Tu
 * Rol en Ellos") porque son dos lentes del mismo tema (el arco genérico del
 * proyecto, y qué hacés vos específicamente dentro de ese arco), y el
 * mecanismo de pastillas de acá abajo ya evita la "pared de contenido": solo
 * se renderiza el grupo activo, nunca los ~16-17 procesos juntos.
 *
 * Orden: primero los momentos comunes del ciclo de vida (mismos para todos
 * los roles), después los grupos propios de cada rol — para que el punto de
 * partida natural (primer grupo con trabajo pendiente, ver
 * defaultGroupIndex en OnboardingJourney.tsx) sea "Inicio del proyecto", no
 * un grupo de rol. Los grupos de PDM (Reporting/Riesgo) y de UX/UI
 * (Discovery/Diseño/Entrega) conviven acá porque cada usuario solo trae (vía
 * findVisibleForRole) los procesos de su propio rol + los COMMON — un grupo
 * sin procesos visibles para ese usuario simplemente se omite (ver
 * groupProcesses más abajo), sin bifurcar esta lista por rol.
 */
const PROYECTOS_Y_ROL_GROUPS: ProcessGroupDef[] = [
  // Ciclo de vida del proyecto (COMMON, mismo para todos los roles)
  { name: "Inicio del proyecto", icon: "🚀", matches: ["Kickoff Interno", "Kickoff del Proyecto con Cliente"] },
  {
    name: "Planificación",
    icon: "📐",
    matches: ["Generación de Historias de Usuario", "Definición de Hitos", "Construcción de Plan de Trabajo"],
  },
  { name: "Ritmo operativo", icon: "⏱️", matches: ["Daily", "Weekly", "Levantamiento de Alertas"] },
  // PDM
  // "Actas de Reunión" vive acá y no en "Cierre de proyecto": su propio
  // contexto ("Inicia al terminar una reunión... dentro de las 24 horas
  // siguientes") lo describe como documentación recurrente ligada a CADA
  // reunión durante todo el proyecto, no una acción de cierre — y de paso
  // el contenido ⚠️ que tiene adentro queda más visible (primer grupo, no
  // el último). Validado contra Metologías (All).md antes de mover.
  {
    name: "Reporting y seguimiento",
    icon: "📊",
    matches: ["Project Status", "360º", "NPS (Net Promoter Score)", "Pulso de Operaciones", "Actas de Reunión"],
  },
  { name: "Riesgo y mejora", icon: "🛡️", matches: ["Matriz de Riesgo", "Planes de Mejora"] },
  // UX/UI Designer
  { name: "Discovery y planificación", icon: "🔍", matches: ["Design Interview", "Plan de Trabajo (Experiencia)", "Sitemaps"] },
  { name: "Diseño y sistema", icon: "🎨", matches: ["Lineamientos de Diseño", "UI Kit / Design System"] },
  {
    name: "Entrega y validación",
    icon: "✅",
    matches: [
      "Handoff al Equipo de Desarrollo",
      "Entrega a Cliente (Diseño)",
      "Revisiones con el Cliente",
      "Revisiones con el Equipo Interno",
      "QA de Prototipo",
    ],
  },
  // Compartido — cierra el recorrido temático de ambos roles
  { name: "Gestión de equipo", icon: "🤝", matches: ["1:1 (One on One)", "Onboarding de Proyecto", "Offboarding", "Empalme de Duplas"] },
  { name: "Cierre de proyecto", icon: "🏁", matches: ["Entrega Parcial", "Entrega Final", "Manejo de Garantía"] },
];

// Key inmutable (ver stage.repository.ts) — exportada para que
// OnboardingJourney.tsx pueda distinguir el copy/comportamiento de esta
// fase sin repetir el literal. El nombre quedó de cuando esta etapa era
// solo "Tu Rol" (módulo 4 del seed original); hoy, tras la fusión, es
// "🔁 Fase 03 · Los Proyectos y Tu Rol en Ellos" — la key en sí es un
// identificador opaco, no necesita coincidir con el título vigente.
export const FASE_04_STAGE_KEY = "modulo_4_tu_rol_en_imagine_apps";

// Misma idea: key opaca heredada del módulo original de "Ecosistema de
// Herramientas y Bienestar". Tras dos migraciones (ver MIGRATIONS.md #7 y
// #8) hoy es "🧭 Tu Día a Día en Imagine Apps": Principios No Negociables +
// Entorno de Trabajo + las 3 políticas que antes vivían en la etapa
// "Recursos" (Vacaciones/Citas Médicas/Cumpleaños, ahora eliminada — esas
// políticas dejaron de estar "siempre disponibles" y pasaron a ser
// contenido real de este módulo). Esta fase no tiene procesos, así que no
// entra en GROUPS_BY_STAGE_KEY; se usa solo para separar sus content items
// en 2 secciones visuales (ver contentItemSection más abajo).
export const FASE_COMO_TRABAJAMOS_STAGE_KEY = "modulo_2_ecosistema_de_herramientas_y_bienestar";

const GROUPS_BY_STAGE_KEY: Record<string, ProcessGroupDef[]> = {
  [FASE_04_STAGE_KEY]: PROYECTOS_Y_ROL_GROUPS,
};

/**
 * Agrupación visual de los content items de "Tu Día a Día en Imagine Apps"
 * en 2 secciones con subtítulo (mismo espíritu que groupProcesses de
 * arriba, pero para content items, que no tienen su propio mecanismo de
 * agrupación) — evita que 6 cards seguidas se sientan como una lista plana
 * sin ninguna organización temática. Match por sub-string sobre el título,
 * igual criterio que ProcessGroupDef.
 */
const BIENESTAR_CONTENT_TITLES = ["Vacaciones", "Citas Médicas", "Cumpleaños"];

export function contentItemSection(title: string): "Reglas y Herramientas" | "Bienestar y Permisos" {
  return BIENESTAR_CONTENT_TITLES.some((t) => title.includes(t)) ? "Bienestar y Permisos" : "Reglas y Herramientas";
}

export type GroupedProcesses<T> = { name: string; icon: string; processes: T[] };

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
      return { name: def.name, icon: def.icon, processes: matched };
    })
    .filter((g) => g.processes.length > 0);

  // Red de seguridad: un proceso nuevo que todavía no tiene grupo asignado
  // no debe desaparecer silenciosamente de la vista.
  const leftover = processes.filter((p) => !used.has(p));
  if (leftover.length > 0) groups.push({ name: "Otros", icon: "📦", processes: leftover });

  return groups;
}
