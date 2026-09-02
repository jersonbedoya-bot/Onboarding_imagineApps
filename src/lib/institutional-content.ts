/**
 * Layout especial para 4 content items institucionales de Fase 01: "Hitos
 * que nos Definieron" se pinta como línea de tiempo (HistoryTimeline),
 * "Proyectos de Alto Impacto" y "Principios No Negociables" como grilla de
 * cards (ImpactProjectsGrid / NonNegotiablesGrid), y los 5 valores dentro de
 * "Quiénes Somos y Nuestra Visión" como mini-cards clickeables
 * (CultureValuesGrid) — en vez del render de texto plano de MarkdownContent
 * para esas partes. Mismo patrón de match por título ya usado en
 * pending-content.ts, sin agregar un tipo de content_item nuevo solo para
 * estos 4 (contenido institucional fijo, no operativo, que no necesita su
 * propio esquema).
 *
 * El body en Mongo sigue siendo Markdown editable desde el admin: una lista
 * con formato fijo (`- **A — B**: C` / `- **A** (B): C` / `- **A:** B` /
 * `1. **A:** B`). Si el admin lo edita y el formato deja de calzar, el
 * parser devuelve `null` y el caller cae al render de MarkdownContent
 * normal — nunca se rompe la vista, en el peor caso se pierde el layout
 * especial.
 */

const HISTORY_TIMELINE_TITLE = "Hitos que nos Definieron";
const IMPACT_PROJECTS_TITLE = "Proyectos de Alto Impacto";
const NON_NEGOTIABLES_TITLE = "Principios No Negociables";
const CULTURE_VALUES_TITLE = "Quiénes Somos y Nuestra Visión";

export function isHistoryTimelineContent(title: string): boolean {
  return title.includes(HISTORY_TIMELINE_TITLE);
}

export function isImpactProjectsContent(title: string): boolean {
  return title.includes(IMPACT_PROJECTS_TITLE);
}

export function isNonNegotiablesContent(title: string): boolean {
  return title.includes(NON_NEGOTIABLES_TITLE);
}

export function isCultureValuesContent(title: string): boolean {
  return title.includes(CULTURE_VALUES_TITLE);
}

export type TimelineItem = { year: string; title: string; description: string };
const TIMELINE_LINE = /^-\s*\*\*(.+?)\s+—\s+(.+?)\*\*:\s*(.+)$/;

export function parseTimelineItems(body: string): TimelineItem[] | null {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"));
  if (lines.length === 0) return null;

  const items = lines.map((line) => {
    const match = TIMELINE_LINE.exec(line);
    if (!match) return null;
    const [, year, title, description] = match;
    return { year, title, description };
  });
  return items.every((item): item is TimelineItem => item !== null) ? items : null;
}

/**
 * Ícono distintivo por sector para ImpactProjectsGrid: no hay logos reales
 * de cliente en el dato (el body es texto libre editado desde el admin), así
 * que en vez de eso se matchea por palabra clave del sector — mismo criterio
 * "nunca se rompe la vista" que el resto del archivo: si el sector no matchea
 * ninguna palabra clave, cae a un ícono genérico.
 */
const SECTOR_ICONS: { keywords: string[]; icon: string }[] = [
  { keywords: ["salud", "farma", "médic", "medic", "clínic", "clinic", "health"], icon: "🏥" },
  { keywords: ["banc", "financ", "fintech", "seguro", "invers"], icon: "🏦" },
  { keywords: ["retail", "comercio", "consumo", "e-commerce", "ecommerce", "tienda"], icon: "🛍️" },
  { keywords: ["educa", "universi", "aprendiz"], icon: "🎓" },
  { keywords: ["logíst", "logist", "transporte", "movilidad"], icon: "🚚" },
  { keywords: ["manufactur", "industri", "fábrica", "fabrica"], icon: "🏭" },
  { keywords: ["tecnolog", "software", "tech", "telecom"], icon: "💻" },
  { keywords: ["energ", "petró", "petro", "gas"], icon: "⚡" },
  { keywords: ["gobierno", "público", "publico", "estado"], icon: "🏛️" },
  { keywords: ["entreten", "media", "medios"], icon: "🎬" },
  { keywords: ["alimento", "food", "bebida"], icon: "🍽️" },
  { keywords: ["construcc", "inmobiliari", "real estate"], icon: "🏗️" },
];
const DEFAULT_SECTOR_ICON = "🏢";

export function sectorIcon(sector: string): string {
  const normalized = sector.toLowerCase();
  const match = SECTOR_ICONS.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)));
  return match?.icon ?? DEFAULT_SECTOR_ICON;
}

export type ImpactProject = { client: string; sector: string; description: string };
const PROJECT_LINE = /^-\s*\*\*(.+?)\*\*\s*\((.+?)\):\s*(.+)$/;

export function parseImpactProjects(body: string): ImpactProject[] | null {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"));
  if (lines.length === 0) return null;

  const items = lines.map((line) => {
    const match = PROJECT_LINE.exec(line);
    if (!match) return null;
    const [, client, sector, description] = match;
    return { client, sector, description };
  });
  return items.every((item): item is ImpactProject => item !== null) ? items : null;
}

/**
 * Ícono fijo por principio para NonNegotiablesGrid, calcado del mismo set ya
 * validado en el mockup de referencia (imagine-apps-onboarding/paso-4-handbook.html)
 * para los mismos 6 no negociables — match por palabra clave del título, no
 * por texto exacto, porque el body es Markdown editable desde el admin.
 */
const NON_NEGOTIABLE_ICONS: { keywords: string[]; icon: string }[] = [
  { keywords: ["transparencia"], icon: "📢" },
  { keywords: ["reunion", "reunión"], icon: "⏰" },
  { keywords: ["30 minutos", "resuelve"], icon: "⏱️" },
  { keywords: ["apropiación", "apropiacion", "negocio"], icon: "🤝" },
  { keywords: ["excelencia"], icon: "🏆" },
  { keywords: ["responsabilidad"], icon: "📅" },
];
const DEFAULT_NON_NEGOTIABLE_ICON = "✅";

export function nonNegotiableIcon(title: string): string {
  const normalized = title.toLowerCase();
  const match = NON_NEGOTIABLE_ICONS.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)));
  return match?.icon ?? DEFAULT_NON_NEGOTIABLE_ICON;
}

const CULTURE_VALUE_ICONS: { keywords: string[]; icon: string }[] = [
  { keywords: ["empatía", "empatia"], icon: "🤝" },
  { keywords: ["impacto"], icon: "🎯" },
  { keywords: ["ownership", "principio a fin", "end-to-end"], icon: "🔁" },
  { keywords: ["lab mindset", "experimentamos"], icon: "🧪" },
  { keywords: ["híbrida", "hibrida", "human"], icon: "🤖" },
];
const DEFAULT_CULTURE_VALUE_ICON = "✨";

export function cultureValueIcon(title: string): string {
  const normalized = title.toLowerCase();
  const match = CULTURE_VALUE_ICONS.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)));
  return match?.icon ?? DEFAULT_CULTURE_VALUE_ICON;
}

export type NonNegotiable = { title: string; description: string };
const NON_NEGOTIABLE_LINE = /^[-*]\s*\*\*(.+?):\*\*\s*(.+)$/;

export function parseNonNegotiables(body: string): NonNegotiable[] | null {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*"));
  if (lines.length === 0) return null;

  const items = lines.map((line) => {
    const match = NON_NEGOTIABLE_LINE.exec(line);
    if (!match) return null;
    const [, title, description] = match;
    return { title, description };
  });
  return items.every((item): item is NonNegotiable => item !== null) ? items : null;
}

/**
 * A diferencia de los otros 3, este content item mezcla prosa (bienvenida +
 * visión) con una lista final ("Nuestros valores") — no es todo-o-nada, así
 * que en vez de reemplazar el body entero se corta en dos: `intro` (todo lo
 * anterior al primer ítem numerado, se sigue viendo con MarkdownContent tal
 * cual) y `values` (la lista, para CultureValuesGrid). Si no hay lista
 * numerada reconocible, devuelve `null` y el caller cae al MarkdownContent
 * de siempre para el body completo.
 */
export type CultureValue = { title: string; description: string };
export type CultureValuesSplit = { intro: string; values: CultureValue[] };
const CULTURE_VALUE_LINE = /^\d+\.\s*\*\*(.+?):\*\*\s*(.+)$/;

export function splitCultureValues(body: string): CultureValuesSplit | null {
  const lines = body.split("\n");
  const listStart = lines.findIndex((line) => CULTURE_VALUE_LINE.test(line.trim()));
  if (listStart === -1) return null;

  const listLines = lines
    .slice(listStart)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const values = listLines.map((line) => {
    const match = CULTURE_VALUE_LINE.exec(line);
    if (!match) return null;
    const [, title, description] = match;
    return { title, description };
  });
  if (!values.every((value): value is CultureValue => value !== null)) return null;

  return { intro: lines.slice(0, listStart).join("\n").trim(), values };
}
