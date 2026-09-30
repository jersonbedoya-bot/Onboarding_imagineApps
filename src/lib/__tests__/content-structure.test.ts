import { describe, expect, it } from "vitest";
import { parseStructured, serializeStructured, emptyModel, quizQuestionProblem, type StructuredModel } from "@/lib/content-structure";
import { splitFactGrid, splitTimeline, splitSteps, splitValuesGrid, parseQuizQuestions } from "@/lib/content-display";

function roundTrip(structured: StructuredModel): StructuredModel | null {
  return parseStructured(structured.format, serializeStructured(structured));
}

describe("content-structure — lo que arma el editor guiado siempre calza con la vista real", () => {
  it("FACT_GRID con intro, badge, enlace y outro", () => {
    const structured: StructuredModel = {
      format: "FACT_GRID",
      model: {
        intro: "Estos son nuestros principios.",
        items: [
          { title: "Transparencia", description: "Compartimos todo." },
          { title: "Proyecto X", badge: "Salud", description: "App de citas." },
          { title: "Basecamp", href: "https://basecamp.com", description: "Gestión de proyectos." },
        ],
        outro: "Cualquier duda, pregunta.",
      },
    };
    const body = serializeStructured(structured);
    expect(splitFactGrid(body)).not.toBeNull();
    expect(roundTrip(structured)).toEqual({
      format: "FACT_GRID",
      model: {
        intro: "Estos son nuestros principios.",
        items: [
          { title: "Transparencia", href: null, description: "Compartimos todo." },
          { title: "Proyecto X", href: null, badge: "Salud", description: "App de citas." },
          { title: "Basecamp", href: "https://basecamp.com", description: "Gestión de proyectos." },
        ],
        outro: "Cualquier duda, pregunta.",
      },
    });
  });

  it("VALUES_GRID", () => {
    const structured: StructuredModel = {
      format: "VALUES_GRID",
      model: { intro: "Nuestra visión:", values: [{ title: "Empatía", description: "Primero las personas." }, { title: "Impacto", description: "Lo que mueve la aguja." }] },
    };
    expect(splitValuesGrid(serializeStructured(structured))).not.toBeNull();
    expect(roundTrip(structured)).toEqual(structured);
  });

  it("TIMELINE", () => {
    const structured: StructuredModel = {
      format: "TIMELINE",
      model: { intro: "", items: [{ year: "2020", title: "Fundación", description: "Tres personas." }, { year: "2023", title: "Primer cliente", description: "Crecimos." }], outro: "" },
    };
    expect(splitTimeline(serializeStructured(structured))).not.toBeNull();
    expect(roundTrip(structured)).toEqual(structured);
  });

  it("STEPS", () => {
    const structured: StructuredModel = { format: "STEPS", model: { intro: "Así se hace:", steps: ["Abre el calendario.", "Bloquea 90 minutos."], outro: "" } };
    expect(splitSteps(serializeStructured(structured))).not.toBeNull();
    expect(roundTrip(structured)).toEqual(structured);
  });

  it("QUIZ con y sin dato curioso, y la correcta en cualquier posición", () => {
    const structured: StructuredModel = {
      format: "QUIZ",
      model: {
        questions: [
          { question: "¿Cuántos días tienes?", options: ["Ninguno", "15 días hábiles", "Una semana"], correctIndex: 1, funFact: "No es acumulable." },
          { question: "¿Canal oficial?", options: ["Google Chat", "Slack"], correctIndex: 0, funFact: "" },
        ],
      },
    };
    const questions = parseQuizQuestions(serializeStructured(structured));
    expect(questions?.[0].correctIndex).toBe(1);
    expect(roundTrip(structured)).toEqual(structured);
  });

  it("filas incompletas no se escriben (si no, todo el bloque caería a texto plano)", () => {
    const structured: StructuredModel = {
      format: "FACT_GRID",
      model: { intro: "", items: [{ title: "Completo", description: "Sí." }, { title: "Sin descripción", description: "  " }], outro: "" },
    };
    const body = serializeStructured(structured);
    expect(body).not.toContain("Sin descripción");
    expect(splitFactGrid(body)?.items).toHaveLength(1);
  });

  it("los saltos de línea dentro de un campo se aplanan (una línea por tarjeta)", () => {
    const structured: StructuredModel = { format: "STEPS", model: { intro: "", steps: ["Primero\nesto", "Después eso"], outro: "" } };
    expect(splitSteps(serializeStructured(structured))?.steps).toEqual(["Primero esto", "Después eso"]);
  });

  it("un body vacío abre el editor vacío; un body con otro patrón devuelve null", () => {
    expect(parseStructured("TIMELINE", "")).toEqual(emptyModel("TIMELINE"));
    expect(parseStructured("TIMELINE", "Solo un párrafo, sin cronología.")).toBeNull();
  });

  it("explica por qué una pregunta todavía no se guarda", () => {
    expect(quizQuestionProblem({ question: "", options: ["a", "b"], correctIndex: 0 })).toMatch(/pregunta/);
    expect(quizQuestionProblem({ question: "¿?", options: ["a", ""], correctIndex: 0 })).toMatch(/2 opciones/);
    expect(quizQuestionProblem({ question: "¿?", options: ["a", "b", ""], correctIndex: 2 })).toMatch(/correcta/);
    expect(quizQuestionProblem({ question: "¿?", options: ["a", "b"], correctIndex: 1 })).toBeNull();
  });
});
