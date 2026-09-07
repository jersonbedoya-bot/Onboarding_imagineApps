/**
 * Marcado visual de contenido que depende de Agents Hub (Bloque 6,
 * adelantado acá porque toca el mismo render que el resto del Bloque 3).
 *
 * Agents Hub está roto/no funcional (instrucción explícita del audit) —
 * esto NO reemplaza ni reescribe ese contenido, solo lo señala. La lista de
 * abajo salió de buscar en Mongo texto realmente visible para el usuario
 * (title/body/instruction) que menciona Agents Hub o a un agente por
 * nombre (Gimena, Gabo, "vibecoding") — no de la lista completa del audit
 * original, que incluía procesos donde esa mención solo vive en el campo
 * `resources` (no se renderiza hoy en la UI, ej. 360º, Planes de Mejora,
 * Onboarding de Proyecto, Entrega Parcial, Plan de Trabajo Experiencia):
 * marcar esos como "pendientes" induciría a error, porque nada roto es
 * visible ahí todavía.
 *
 * Match por sub-string de título, mismo criterio que phase-groups.ts.
 */
const PENDING_PROCESS_TITLES: string[] = [
  // "Actas de Reunión" salió de esta lista: el proceso ya no depende de
  // Agents Hub, se reescribió para describir el flujo automatizado real
  // (Apps Script + Gemini, ver el proceso en Mongo) — dejar la lista vacía
  // en vez de borrarla, sigue siendo el lugar donde va el próximo caso.
];

const PENDING_STEP_TITLES = [
  // "Invocar a Gimena" (Generación de HUs) salió de esta lista: ese proceso
  // se reescribió sin ninguna mención a Agents Hub/Gimena — ya no aplica.
  "Crear las historias de usuario", // Construcción de Plan de Trabajo — "con ayuda de Gimena"
  "Coordinar con Dev antes de codear (si aplica vibecoding)", // Handoff
  "Documentar cambios en Markdown (si aplica vibecoding)", // Handoff
];

// "Ecosistema Digital de Trabajo" salió de esta lista: su body se
// reescribió (herramientas actuales: Basecamp, Google Chat/Gmail, Google
// Drive, Magi, Figma) y ya no menciona Agents Hub.
const PENDING_CONTENT_ITEM_TITLES: string[] = [];

function matches(title: string, list: string[]): boolean {
  return list.some((m) => title.includes(m));
}

export function isPendingProcess(title: string): boolean {
  return matches(title, PENDING_PROCESS_TITLES);
}

export function isPendingStep(title: string): boolean {
  return matches(title, PENDING_STEP_TITLES);
}

export function isPendingContentItem(title: string): boolean {
  return matches(title, PENDING_CONTENT_ITEM_TITLES);
}
