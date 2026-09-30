/**
 * Puente entre el editor guiado de ContentForm (campos: pregunta, opciones,
 * año, título...) y el `body` Markdown que ya guarda y renderiza el
 * onboarding (ver content-display.ts). Pedido explícito del usuario: quien
 * edita contenido no debería tener que escribir guiones, asteriscos ni
 * negritas en un orden exacto para que un quiz o una cronología "calcen".
 *
 * El body sigue siendo la única fuente de verdad en la base — esto solo lo
 * arma (serialize*) desde campos y lo desarma (parse*) hacia campos,
 * reutilizando los MISMOS parsers que usa la vista real, así que lo que el
 * editor guiado guarda siempre se ve con el formato especial.
 *
 * Filas incompletas (sin título o sin descripción) no se escriben: una sola
 * línea mal formada haría que el parser rechace el bloque entero y todo caiga
 * a texto plano. El editor las marca en pantalla para que se completen.
 */
import {
  splitFactGrid,
  splitValuesGrid,
  splitTimeline,
  splitSteps,
  parseQuizQuestions,
  type FactItem,
  type ValueItem,
  type TimelineItem,
  type QuizQuestion,
} from "@/lib/content-display";
import type { ContentDisplayFormat } from "@/types/enums";

export type StructuredFormat = Exclude<ContentDisplayFormat, "PROSE">;

export type FactGridModel = { intro: string; items: FactItem[]; outro: string };
export type ValuesGridModel = { intro: string; values: ValueItem[] };
export type TimelineModel = { intro: string; items: TimelineItem[]; outro: string };
export type StepsModel = { intro: string; steps: string[]; outro: string };
export type QuizModel = { questions: QuizQuestion[] };

export type StructuredModel =
  | { format: "FACT_GRID"; model: FactGridModel }
  | { format: "VALUES_GRID"; model: ValuesGridModel }
  | { format: "TIMELINE"; model: TimelineModel }
  | { format: "STEPS"; model: StepsModel }
  | { format: "QUIZ"; model: QuizModel };

/** Un campo de una sola línea: los saltos de línea romperían el patrón. */
function oneLine(text: string): string {
  return text.replace(/\s*\n+\s*/g, " ").trim();
}

function joinBlocks(...blocks: string[]): string {
  return blocks.map((b) => b.trim()).filter(Boolean).join("\n\n");
}

export function emptyModel(format: StructuredFormat): StructuredModel {
  switch (format) {
    case "FACT_GRID":
      return { format, model: { intro: "", items: [{ title: "", description: "" }], outro: "" } };
    case "VALUES_GRID":
      return { format, model: { intro: "", values: [{ title: "", description: "" }] } };
    case "TIMELINE":
      return { format, model: { intro: "", items: [{ year: "", title: "", description: "" }], outro: "" } };
    case "STEPS":
      return { format, model: { intro: "", steps: ["", ""], outro: "" } };
    case "QUIZ":
      return { format, model: { questions: [emptyQuizQuestion()] } };
  }
}

export function emptyQuizQuestion(): QuizQuestion {
  return { question: "", options: ["", ""], correctIndex: 0, funFact: "" };
}

/**
 * Desarma un body existente en campos. `null` = el texto actual no tiene el
 * patrón de ese formato (el editor ofrece empezar de cero o seguir en modo
 * texto). Un body vacío siempre da un modelo vacío.
 */
export function parseStructured(format: StructuredFormat, body: string): StructuredModel | null {
  if (!body.trim()) return emptyModel(format);
  switch (format) {
    case "FACT_GRID": {
      const split = splitFactGrid(body);
      return split ? { format, model: split } : null;
    }
    case "VALUES_GRID": {
      const split = splitValuesGrid(body);
      return split ? { format, model: split } : null;
    }
    case "TIMELINE": {
      const split = splitTimeline(body);
      return split ? { format, model: split } : null;
    }
    case "STEPS": {
      const split = splitSteps(body);
      return split ? { format, model: split } : null;
    }
    case "QUIZ": {
      const questions = parseQuizQuestions(body);
      return questions ? { format, model: { questions: questions.map((q) => ({ ...q, funFact: q.funFact ?? "" })) } } : null;
    }
  }
}

function factTitle(item: FactItem): string {
  const title = oneLine(item.title);
  const href = item.href ? oneLine(item.href) : "";
  return href ? `[${title}](${href})` : title;
}

export function serializeStructured(structured: StructuredModel): string {
  switch (structured.format) {
    case "FACT_GRID": {
      const { intro, items, outro } = structured.model;
      const lines = items
        .filter((item) => oneLine(item.title) && oneLine(item.description))
        .map((item) => {
          const badge = item.badge ? oneLine(item.badge) : "";
          return badge
            ? `- **${factTitle(item)}** (${badge}): ${oneLine(item.description)}`
            : `- **${factTitle(item)}:** ${oneLine(item.description)}`;
        });
      return joinBlocks(intro, lines.join("\n"), outro);
    }
    case "VALUES_GRID": {
      const { intro, values } = structured.model;
      const lines = values
        .filter((value) => oneLine(value.title) && oneLine(value.description))
        .map((value, i) => `${i + 1}. **${oneLine(value.title)}:** ${oneLine(value.description)}`);
      return joinBlocks(intro, lines.join("\n"));
    }
    case "TIMELINE": {
      const { intro, items, outro } = structured.model;
      const lines = items
        .filter((item) => oneLine(item.year) && oneLine(item.title) && oneLine(item.description))
        .map((item) => `- **${oneLine(item.year)} — ${oneLine(item.title)}**: ${oneLine(item.description)}`);
      return joinBlocks(intro, lines.join("\n"), outro);
    }
    case "STEPS": {
      const { intro, steps, outro } = structured.model;
      const lines = steps.map(oneLine).filter(Boolean).map((step, i) => `${i + 1}. ${step}`);
      return joinBlocks(intro, lines.join("\n"), outro);
    }
    case "QUIZ": {
      const blocks = structured.model.questions
        .map((q) => {
          const options = q.options.map(oneLine);
          const filled = options.map((text, index) => ({ text, index })).filter((o) => o.text);
          const question = oneLine(q.question);
          if (!question || filled.length < 2 || !filled.some((o) => o.index === q.correctIndex)) return null;
          return { question, filled, correctIndex: q.correctIndex, funFact: oneLine(q.funFact ?? "") };
        })
        .filter((q): q is NonNullable<typeof q> => q !== null)
        .map((q, i) =>
          [
            `${i + 1}. ${q.question}`,
            ...q.filled.map((o) => (o.index === q.correctIndex ? `- **${o.text}**` : `- ${o.text}`)),
            ...(q.funFact ? [q.funFact] : []),
          ].join("\n"),
        );
      return blocks.join("\n\n");
    }
  }
}

/** Por qué una fila no se va a guardar todavía (para mostrarlo al lado), o null si está completa. */
export function quizQuestionProblem(q: QuizQuestion): string | null {
  if (!oneLine(q.question)) return "Falta escribir la pregunta.";
  const filled = q.options.filter((o) => oneLine(o)).length;
  if (filled < 2) return "Necesita al menos 2 opciones con texto.";
  if (!oneLine(q.options[q.correctIndex] ?? "")) return "Marca cuál opción es la correcta.";
  return null;
}
