/**
 * Parsers para `content_items.displayFormat` (ver src/types/enums.ts) —
 * reemplaza dos mecanismos previos que existían por separado y que
 * decidían el layout especial ADIVINANDO por el título del content item
 * (institutional-content.ts, para 5 items de Módulo 1; daily-life-content.ts,
 * agregado después para 2 items más de Módulo 2). El problema real de ese
 * enfoque, encontrado auditando el contenido completo a pedido del usuario:
 * cada card especial se construía una por una sin una regla común, así que
 * dos content items del mismo "tipo" (hechos independientes, ej. Principios
 * No Negociables vs. Proyectos de Alto Impacto) terminaban con
 * implementaciones/interacciones distintas — y encima, renombrar un título
 * perdía el layout en silencio.
 *
 * Ahora el formato es un campo explícito que la admin elige desde
 * ContentForm.tsx — el body sigue siendo Markdown editable, cada formato
 * espera un patrón de texto específico (documentado en cada parser de
 * abajo), y si no calza, el parser devuelve `null` y OnboardingJourney.tsx
 * cae al MarkdownContent normal. Mismo criterio "nunca se rompe la vista"
 * de siempre — solo que ahora la causa de perder el layout especial es
 * "el texto no tiene el formato esperado", nunca "alguien tocó el título".
 */

/**
 * Encuentra el primer bloque contiguo de líneas que matchean `isLine` (se
 * permiten líneas vacías DENTRO del bloque, pero no arrancan ni terminan
 * uno). Usado por los 3 parsers de abajo para cortar el body en
 * intro/bloque/outro — el texto antes y después del bloque se sigue
 * mostrando con MarkdownContent tal cual (headings, callouts, contactos de
 * emergencia, etc. no se pierden).
 */
function findContiguousBlock(lines: string[], isLine: (line: string) => boolean): { start: number; end: number } | null {
  const start = lines.findIndex(isLine);
  if (start === -1) return null;

  let end = start;
  while (end + 1 < lines.length && (isLine(lines[end + 1]) || lines[end + 1].trim() === "")) {
    end++;
  }
  while (end > start && lines[end].trim() === "") end--;

  return { start, end };
}

// ───────────────────────── FACT_GRID ─────────────────────────

/**
 * Hechos paralelos e independientes entre sí (sin orden): principios,
 * herramientas, valores, proyectos — se muestran siempre visibles, sin
 * clic (a diferencia de VALUES_GRID, ver más abajo). Acepta 2 formas de
 * línea, ambas con el título en negrita:
 *   - `- **Título:** descripción` (o numerada: `1. **Título:** descripción`)
 *   - `- **Título** (Badge): descripción` — el badge es una etiqueta corta
 *     opcional (ej. sector de un proyecto), se muestra como pill.
 */
export type FactItem = { title: string; href?: string | null; badge?: string; description: string };
export type FactGridSplit = { intro: string; items: FactItem[]; outro: string };

const FACT_LINE_WITH_BADGE = /^[-*\d.]+\s*\*\*(.+?)\*\*\s*\((.+?)\):\s*(.+)$/;
const FACT_LINE_PLAIN = /^[-*\d.]+\s*\*\*(.+?):\*\*\s*(.+)$/;
const TITLE_LINK = /^\[(.+)\]\((.+)\)$/;

function parseFactTitle(raw: string): { title: string; href: string | null } {
  const match = TITLE_LINK.exec(raw);
  return match ? { title: match[1], href: match[2] } : { title: raw, href: null };
}

function parseFactLine(line: string): FactItem | null {
  const withBadge = FACT_LINE_WITH_BADGE.exec(line);
  if (withBadge) {
    const [, rawTitle, badge, description] = withBadge;
    return { ...parseFactTitle(rawTitle), badge, description };
  }
  const plain = FACT_LINE_PLAIN.exec(line);
  if (plain) {
    const [, rawTitle, description] = plain;
    return { ...parseFactTitle(rawTitle), description };
  }
  return null;
}

export function splitFactGrid(body: string): FactGridSplit | null {
  const lines = body.split("\n");
  const block = findContiguousBlock(lines, (line) => /^[-*]\s|^\d+\.\s/.test(line.trim()));
  if (!block) return null;

  const blockLines = lines.slice(block.start, block.end + 1).filter((line) => line.trim().length > 0);
  const items = blockLines.map((line) => parseFactLine(line.trim()));
  if (!items.every((item): item is FactItem => item !== null)) return null;

  return {
    intro: lines.slice(0, block.start).join("\n").trim(),
    items,
    outro: lines.slice(block.end + 1).join("\n").trim(),
  };
}

const FACT_ICONS: { keywords: string[]; icon: string }[] = [
  // Principios No Negociables
  { keywords: ["transparencia"], icon: "📢" },
  { keywords: ["reunion", "reunión"], icon: "⏰" },
  { keywords: ["30 minutos", "resuelve"], icon: "⏱️" },
  { keywords: ["apropiación", "apropiacion", "negocio"], icon: "🤝" },
  { keywords: ["excelencia"], icon: "🏆" },
  { keywords: ["responsabilidad"], icon: "📅" },
  // Ecosistema Digital de Trabajo
  { keywords: ["basecamp"], icon: "📋" },
  { keywords: ["chat", "gmail"], icon: "💬" },
  { keywords: ["drive"], icon: "📁" },
  { keywords: ["magi"], icon: "🤖" },
  { keywords: ["figma"], icon: "🎨" },
];
const DEFAULT_FACT_ICON = "✅";

export function factIcon(title: string): string {
  const normalized = title.toLowerCase();
  const match = FACT_ICONS.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)));
  return match?.icon ?? DEFAULT_FACT_ICON;
}

/**
 * Ícono distintivo por sector (para el badge de "Proyectos de Alto
 * Impacto") — no hay logos reales de cliente en el dato (el body es texto
 * libre editado desde el admin), así que en vez de eso se matchea por
 * palabra clave del sector; si no matchea ninguna, cae a un ícono genérico.
 */
const SECTOR_ICONS: { keywords: string[]; icon: string }[] = [
  { keywords: ["salud", "farma", "médic", "medic", "clínic", "clinic", "health"], icon: "🏥" },
  { keywords: ["banc", "financ", "fintech", "seguro", "invers"], icon: "🏦" },
  { keywords: ["retail", "comercio", "consumo", "e-commerce", "ecommerce", "tienda", "horeca"], icon: "🛍️" },
  { keywords: ["educa", "universi", "aprendiz"], icon: "🎓" },
  { keywords: ["logíst", "logist", "transporte", "movilidad", "distribuc"], icon: "🚚" },
  { keywords: ["manufactur", "industri", "fábrica", "fabrica"], icon: "🏭" },
  { keywords: ["tecnolog", "software", "tech", "telecom"], icon: "💻" },
  { keywords: ["energ", "petró", "petro", "gas"], icon: "⚡" },
  { keywords: ["gobierno", "público", "publico", "estado"], icon: "🏛️" },
  { keywords: ["entreten", "media", "medios"], icon: "🎬" },
  { keywords: ["alimento", "food", "bebida"], icon: "🍽️" },
  { keywords: ["construcc", "inmobiliari", "real estate"], icon: "🏗️" },
];
const DEFAULT_SECTOR_ICON = "🏢";

export function factBadgeIcon(sector: string): string {
  const normalized = sector.toLowerCase();
  const match = SECTOR_ICONS.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)));
  return match?.icon ?? DEFAULT_SECTOR_ICON;
}

// ───────────────────────── VALUES_GRID ─────────────────────────

/**
 * Única excepción deliberada al "siempre visible" de FACT_GRID: contenido
 * de cultura/valores (hoy solo "Nuestra Visión"), pensado para leerse de a
 * uno con calma, no para escanear como referencia rápida — arranca
 * colapsado, clic para descubrir (ver CultureValuesGrid.tsx). Formato:
 * líneas numeradas `N. **Título:** descripción`.
 */
export type ValueItem = { title: string; description: string };
export type ValuesGridSplit = { intro: string; values: ValueItem[] };
const VALUE_LINE = /^\d+\.\s*\*\*(.+?):\*\*\s*(.+)$/;

export function splitValuesGrid(body: string): ValuesGridSplit | null {
  const lines = body.split("\n");
  const listStart = lines.findIndex((line) => VALUE_LINE.test(line.trim()));
  if (listStart === -1) return null;

  const listLines = lines
    .slice(listStart)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const values = listLines.map((line) => {
    const match = VALUE_LINE.exec(line);
    if (!match) return null;
    const [, title, description] = match;
    return { title, description };
  });
  if (!values.every((value): value is ValueItem => value !== null)) return null;

  return { intro: lines.slice(0, listStart).join("\n").trim(), values };
}

const VALUE_ICONS: { keywords: string[]; icon: string }[] = [
  { keywords: ["empatía", "empatia"], icon: "🤝" },
  { keywords: ["impacto"], icon: "🎯" },
  { keywords: ["ownership", "principio a fin", "end-to-end"], icon: "🔁" },
  { keywords: ["lab mindset", "experimentamos"], icon: "🧪" },
  { keywords: ["híbrida", "hibrida", "human"], icon: "🤖" },
];
const DEFAULT_VALUE_ICON = "✨";

export function valueIcon(title: string): string {
  const normalized = title.toLowerCase();
  const match = VALUE_ICONS.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)));
  return match?.icon ?? DEFAULT_VALUE_ICON;
}

// ───────────────────────── TIMELINE ─────────────────────────

/**
 * Cronología — el ÚNICO formato donde el orden temporal es el punto (hoy
 * solo "Hitos que nos Definieron"). Formato: `- **Año — Título**: descripción`.
 */
export type TimelineItem = { year: string; title: string; description: string };
export type TimelineSplit = { intro: string; items: TimelineItem[]; outro: string };
const TIMELINE_LINE = /^-\s*\*\*(.+?)\s+—\s+(.+?)\*\*:\s*(.+)$/;

export function splitTimeline(body: string): TimelineSplit | null {
  const lines = body.split("\n");
  const block = findContiguousBlock(lines, (line) => line.trim().startsWith("-"));
  if (!block) return null;

  const blockLines = lines.slice(block.start, block.end + 1).filter((line) => line.trim().length > 0);
  const items = blockLines.map((line) => {
    const match = TIMELINE_LINE.exec(line.trim());
    if (!match) return null;
    const [, year, title, description] = match;
    return { year, title, description };
  });
  if (!items.every((item): item is TimelineItem => item !== null)) return null;

  return {
    intro: lines.slice(0, block.start).join("\n").trim(),
    items,
    outro: lines.slice(block.end + 1).join("\n").trim(),
  };
}

// ───────────────────────── STEPS ─────────────────────────

/**
 * Procedimiento EN ORDEN (a diferencia de FACT_GRID: acá el paso 2 puede
 * depender de haber hecho el paso 1) — hoy solo "Timeboxing". El grid usa
 * un número en vez de ícono para no perder esa relación de orden. Formato:
 * líneas `N. instrucción` (una oración completa por paso, sin `**título:**`
 * propio).
 */
export type StepsSplit = { intro: string; steps: string[]; outro: string };
const STEP_LINE = /^\d+\.\s*(.+)$/;

export function splitSteps(body: string): StepsSplit | null {
  const lines = body.split("\n");
  const block = findContiguousBlock(lines, (line) => STEP_LINE.test(line.trim()));
  if (!block) return null;

  const blockLines = lines.slice(block.start, block.end + 1).filter((line) => line.trim().length > 0);
  const steps = blockLines.map((line) => STEP_LINE.exec(line.trim())?.[1] ?? null);
  if (!steps.every((step): step is string => step !== null)) return null;
  if (steps.length < 2) return null; // un solo paso no amerita grid

  return {
    intro: lines.slice(0, block.start).join("\n").trim(),
    steps,
    outro: lines.slice(block.end + 1).join("\n").trim(),
  };
}

const STEP_NUMBER_ICONS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export function stepNumberIcon(index: number): string {
  return STEP_NUMBER_ICONS[index] ?? `${index + 1}.`;
}

// ───────────────────────── QUIZ ─────────────────────────

/**
 * Quiz de opción múltiple: cada pregunta es una línea `N. texto` seguida
 * de 2+ líneas de opción `- texto`, con la opción correcta envuelta en
 * `**negrita**`, y opcionalmente una línea de dato curioso (texto plano,
 * sin `-` ni número) que se muestra como feedback sea cual sea la
 * respuesta elegida. Si una pregunta no calza el formato, devuelve `null`
 * completo (no un subconjunto parcial).
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
