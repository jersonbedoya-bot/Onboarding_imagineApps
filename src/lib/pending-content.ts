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
const PENDING_PROCESS_TITLES = [
  "Actas de Reunión", // el proceso entero gira en torno a "Agents Hub (Acta IA)" (pasos 1 y 2)
];

const PENDING_STEP_TITLES = [
  "Invocar a Gimena", // Generación de HUs — instrucción: "Abrir Agents Hub..."
  "Crear las historias de usuario", // Construcción de Plan de Trabajo — "con ayuda de Gimena"
  "Coordinar con Dev antes de codear (si aplica vibecoding)", // Handoff
  "Documentar cambios en Markdown (si aplica vibecoding)", // Handoff
];

const PENDING_CONTENT_ITEM_TITLES = [
  "Ecosistema Digital de Trabajo", // menciona Agents Hub como una de varias herramientas
];

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
