/**
 * Layout especial para 2 content items del módulo "🧭 Tu Día a Día en
 * Imagine Apps", sección "Reglas y Herramientas" (ver `contentItemSection`
 * en phase-groups.ts): el usuario notó que "Principios No Negociables"
 * (institutional-content.ts) ya se veía como grid de tarjetas, mientras que
 * sus 2 vecinas en esa misma sección visual — "Ecosistema Digital de
 * Trabajo" y "Uso del Calendario (Timeboxing)" — se veían como texto
 * plano: inconsistente dentro de una misma sección. Acá van sus
 * parsers/tratamiento especial, en un archivo separado de
 * institutional-content.ts porque ese archivo es específico de los 5 items
 * de Módulo 1 (ver su comentario) y estos 2 son de otro módulo.
 *
 * Mismo criterio que institutional-content.ts en todo: match por TÍTULO (si
 * el admin lo renombra, pierde el layout especial en silencio) y, si el
 * body no calza el formato esperado, el parser devuelve `null` y el caller
 * cae al MarkdownContent normal — nunca se rompe la vista.
 */

const DIGITAL_ECOSYSTEM_TITLE = "Ecosistema Digital de Trabajo";
const TIMEBOXING_TITLE = "Timeboxing";

export function isDigitalEcosystemContent(title: string): boolean {
  return title.includes(DIGITAL_ECOSYSTEM_TITLE);
}

export function isTimeboxingContent(title: string): boolean {
  return title.includes(TIMEBOXING_TITLE);
}

/**
 * Encuentra el primer bloque contiguo de líneas que matchean `isLine` (se
 * permiten líneas vacías DENTRO del bloque, pero no arrancan ni terminan
 * uno) y devuelve dónde empieza y termina — usado por splitToolsList y
 * splitNumberedSteps para cortar el body en intro/bloque/outro.
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

/**
 * "Ecosistema Digital de Trabajo" mezcla una lista de herramientas
 * (formato `- **Título:** descripción`, igual a NON_NEGOTIABLE_LINE en
 * institutional-content.ts) con un aviso de contacto de emergencia al
 * final — no es todo-o-nada como Principios No Negociables. Se corta en 3:
 * `intro` (el encabezado antes de la lista), `items` (la lista, para el
 * grid) y `outro` (todo lo que sigue, se ve con MarkdownContent tal cual).
 * Varias herramientas llevan su nombre como link Markdown (`**[Basecamp]
 * (url):**`) — se separa label/href para que el título de la tarjeta siga
 * siendo clickeable en vez de mostrar la sintaxis cruda como texto.
 */
export type ToolItem = { title: string; href: string | null; description: string };
export type ToolsSplit = { intro: string; items: ToolItem[]; outro: string };
const TOOL_LINE = /^[-*]\s*\*\*(.+?):\*\*\s*(.+)$/;
const TOOL_TITLE_LINK = /^\[(.+)\]\((.+)\)$/;

function parseToolTitle(raw: string): { title: string; href: string | null } {
  const match = TOOL_TITLE_LINK.exec(raw);
  return match ? { title: match[1], href: match[2] } : { title: raw, href: null };
}

export function splitToolsList(body: string): ToolsSplit | null {
  const lines = body.split("\n");
  const block = findContiguousBlock(lines, (line) => /^[-*]\s/.test(line.trim()));
  if (!block) return null;

  const blockLines = lines.slice(block.start, block.end + 1).filter((line) => line.trim().length > 0);
  const items = blockLines.map((line) => {
    const match = TOOL_LINE.exec(line.trim());
    if (!match) return null;
    const [, rawTitle, description] = match;
    return { ...parseToolTitle(rawTitle), description };
  });
  if (!items.every((item): item is ToolItem => item !== null)) return null;

  return {
    intro: lines.slice(0, block.start).join("\n").trim(),
    items,
    outro: lines.slice(block.end + 1).join("\n").trim(),
  };
}

const TOOL_ICONS: { keywords: string[]; icon: string }[] = [
  { keywords: ["basecamp"], icon: "📋" },
  { keywords: ["chat", "gmail"], icon: "💬" },
  { keywords: ["drive"], icon: "📁" },
  { keywords: ["magi"], icon: "🤖" },
  { keywords: ["figma"], icon: "🎨" },
];
const DEFAULT_TOOL_ICON = "🧰";

export function toolIcon(title: string): string {
  const normalized = title.toLowerCase();
  const match = TOOL_ICONS.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword)));
  return match?.icon ?? DEFAULT_TOOL_ICON;
}

/**
 * "Uso del Calendario (Timeboxing)" es una guía de pasos EN ORDEN — a
 * diferencia de las demás (ítems paralelos/independientes entre sí), acá
 * importa la secuencia (el paso 2 asume que ya hiciste el 1). El grid usa
 * un número en vez de ícono para no perder esa relación de orden. Formato
 * esperado: líneas `N. instrucción` (una oración completa por paso, sin
 * `**título:**` propio). Se corta en `intro` + `steps` + `outro`, mismo
 * criterio que splitToolsList.
 */
export type StepsSplit = { intro: string; steps: string[]; outro: string };
const NUMBERED_STEP_LINE = /^\d+\.\s*(.+)$/;

export function splitNumberedSteps(body: string): StepsSplit | null {
  const lines = body.split("\n");
  const block = findContiguousBlock(lines, (line) => NUMBERED_STEP_LINE.test(line.trim()));
  if (!block) return null;

  const blockLines = lines.slice(block.start, block.end + 1).filter((line) => line.trim().length > 0);
  const steps = blockLines.map((line) => NUMBERED_STEP_LINE.exec(line.trim())?.[1] ?? null);
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
