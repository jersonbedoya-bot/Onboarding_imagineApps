/**
 * Layout especial para 2 content items institucionales de Fase 01: "Hitos
 * que nos Definieron" se pinta como línea de tiempo (HistoryTimeline) y
 * "Proyectos de Alto Impacto" como grilla de cards (ImpactProjectsGrid), en
 * vez del render de texto plano de MarkdownContent — mismo patrón de match
 * por título ya usado en pending-content.ts, sin agregar un tipo de
 * content_item nuevo solo para estos 2 (contenido institucional fijo, no
 * operativo, que no necesita su propio esquema).
 *
 * El body en Mongo sigue siendo Markdown editable desde el admin: una lista
 * con formato fijo (`- **A — B**: C` / `- **A** (B): C`). Si el admin lo
 * edita y el formato deja de calzar, el parser devuelve `null` y el caller
 * cae al render de MarkdownContent normal — nunca se rompe la vista, en el
 * peor caso se pierde el layout especial.
 */

const HISTORY_TIMELINE_TITLE = "Hitos que nos Definieron";
const IMPACT_PROJECTS_TITLE = "Proyectos de Alto Impacto";

export function isHistoryTimelineContent(title: string): boolean {
  return title.includes(HISTORY_TIMELINE_TITLE);
}

export function isImpactProjectsContent(title: string): boolean {
  return title.includes(IMPACT_PROJECTS_TITLE);
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
