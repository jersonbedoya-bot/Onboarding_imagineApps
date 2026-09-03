/**
 * Layout especial para 5 content items institucionales de Módulo 1: "Hitos
 * que nos Definieron" se pinta como línea de tiempo (HistoryTimeline),
 * "Proyectos de Alto Impacto" y "Principios No Negociables" como grilla de
 * cards (ImpactProjectsGrid / NonNegotiablesGrid), los 5 valores dentro de
 * "Nuestra Visión" como mini-cards clickeables
 * (CultureValuesGrid), y un quiz de opción múltiple como el de
 * "Pon a Prueba lo que Aprendiste" (QuizBlock) — en vez del render de texto
 * plano de MarkdownContent para esas partes. Mismo patrón de match por
 * título ya usado en pending-content.ts, sin agregar un tipo de
 * `content_item` nuevo solo para estos 5 (contenido institucional fijo, no
 * operativo, que no necesita su propio esquema — ver BACKLOG.md, que en su
 * momento diseñó el quiz asumiendo que hacía falta un tipo nuevo; el patrón
 * de acá lo resuelve sin tocar `schema.ts`).
 *
 * El body en Mongo sigue siendo Markdown editable desde el admin: una lista
 * con formato fijo (`- **A — B**: C` / `- **A** (B): C` / `- **A:** B` /
 * `1. **A:** B` / preguntas numeradas + opciones `-`, ver QUIZ_QUESTION_LINE
 * más abajo). Si el admin lo edita y el formato deja de calzar, el parser
 * devuelve `null` y el caller cae al render de MarkdownContent normal —
 * nunca se rompe la vista, en el peor caso se pierde el layout especial.
 * OJO: el match es por TÍTULO — si el admin renombra alguno de estos 5 items
 * de forma que ya no incluya la constante de abajo, pasa lo mismo (pierde el
 * layout especial en silencio, sin error visible). Si el título cambia,
 * hay que actualizar la constante acá.
 */

const HISTORY_TIMELINE_TITLE = "Hitos que nos Definieron";
const IMPACT_PROJECTS_TITLE = "Proyectos de Alto Impacto";
const NON_NEGOTIABLES_TITLE = "Principios No Negociables";
const CULTURE_VALUES_TITLE = "Nuestra Visión";
const QUIZ_TITLE = "Pon a Prueba lo que Aprendiste";

export function isHistoryTimelineContent(title: string): boolean {
  return title.includes(HISTORY_TIMELINE_TITLE);
}

export function isImpactProjectsContent(title: string): boolean {
  return title.includes(IMPACT_PROJECTS_TITLE);
}

export function isNonNegotiablesContent(title: string): boolean {
  return title.includes(NON_NEGOTIABLES_TITLE);
}

export function isQuizContent(title: string): boolean {
  return title.includes(QUIZ_TITLE);
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

/**
 * Quiz de opción múltiple (BACKLOG.md, "retomado" a pedido del usuario):
 * preguntas divertidas de cultura/historia, no simuladores técnicos de
 * decisión — ese estilo (imagine-apps-onboarding/paso-1..3, "sim-scenario-box")
 * se evaluó y se descartó a propósito (ver comentario en phase-groups.ts).
 * El único que sí se adoptó de la maqueta es el "Micro-Reto: El ADN de
 * Imagine Apps" de index.html — acá se generaliza a N preguntas por content
 * item en vez de 1 sola.
 *
 * Formato del body (Markdown editable desde el admin): cada pregunta es una
 * línea `N. texto` seguida de 2+ líneas de opción `- texto`, con la opción
 * correcta envuelta en `**negrita**`, y opcionalmente una línea de dato
 * curioso (texto plano, sin `-` ni número) que se muestra como feedback sea
 * cual sea la respuesta elegida. Igual criterio que el resto del archivo:
 * si una pregunta no calza el formato, se devuelve `null` completo (no un
 * subconjunto parcial) y el caller cae a MarkdownContent normal.
 */
export type QuizQuestion = { question: string; options: string[]; correctIndex: number; funFact?: string };
const QUIZ_QUESTION_LINE = /^\d+\.\s*(.+)$/;
const QUIZ_OPTION_LINE = /^[-*]\s*(.+)$/;
const QUIZ_CORRECT_OPTION = /^\*\*(.+)\*\*$/;

export function parseQuizQuestions(body: string): QuizQuestion[] | null {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return null;

  const questions: QuizQuestion[] = [];
  let i = 0;
  while (i < lines.length) {
    const questionMatch = QUIZ_QUESTION_LINE.exec(lines[i]);
    if (!questionMatch) return null;
    const question = questionMatch[1];
    i++;

    const options: string[] = [];
    let correctIndex = -1;
    while (i < lines.length && QUIZ_OPTION_LINE.test(lines[i])) {
      const optionMatch = QUIZ_OPTION_LINE.exec(lines[i])!;
      const correctMatch = QUIZ_CORRECT_OPTION.exec(optionMatch[1]);
      if (correctMatch) correctIndex = options.length;
      options.push(correctMatch ? correctMatch[1] : optionMatch[1]);
      i++;
    }
    if (options.length < 2 || correctIndex === -1) return null;

    let funFact: string | undefined;
    if (i < lines.length && !QUIZ_QUESTION_LINE.test(lines[i])) {
      funFact = lines[i];
      i++;
    }

    questions.push({ question, options, correctIndex, funFact });
  }

  return questions.length > 0 ? questions : null;
}
