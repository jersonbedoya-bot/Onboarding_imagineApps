"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { QuizQuestion } from "@/lib/content-display";
import { cn } from "@/lib/cn";

const LETTERS = ["A", "B", "C", "D"];

// Cuántas preguntas se muestran por intento, sorteadas del banco completo
// que el admin escribe en el body (ver content-display.ts) — pedido
// explícito del usuario: un banco más grande del que se elige un
// subconjunto al azar cada vez, para que el quiz no sea siempre exactamente
// igual. Si el banco tiene menos preguntas que esto, se muestran todas.
const QUESTIONS_PER_ATTEMPT = 5;

function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Baraja las opciones de una pregunta (Fisher-Yates) y recalcula
 * `correctIndex` a su nueva posición. Arregla de raíz el problema real
 * encontrado en contenido ya publicado: las 15 preguntas de los 3 quizzes
 * tenían la respuesta correcta siempre en la opción B — el orden en el
 * body de Markdown (la correcta va "en el medio" al redactar la pregunta)
 * se traducía 1:1 al orden mostrado. Barajar en el cliente arregla esto
 * para siempre sin migrar contenido ni depender de que quien escriba una
 * pregunta nueva se acuerde de variar el orden a mano.
 */
function shuffleQuestionOptions(question: QuizQuestion): QuizQuestion {
  const correctOption = question.options[question.correctIndex];
  const options = shuffleArray(question.options);
  return { ...question, options, correctIndex: options.indexOf(correctOption) };
}

type QuizState = { shuffled: QuizQuestion[]; answers: Record<number, number> };

/**
 * Quiz de opción múltiple, divertido y sin evaluación real que afecte el
 * progreso (contenido con `displayFormat: "QUIZ"`, ver content-display.ts):
 * la respuesta CORRECTA no se exige — cualquier opción cuenta como
 * "respondida" — solo se exige responder las preguntas mostradas (pedido
 * explícito del usuario, ver el gate en OnboardingJourney). Nada de esto
 * afecta `user_progress` ni el avance del recorrido — es puramente
 * informativo para quien lo responde.
 *
 * Sí se PERSISTE cada respuesta (ver quiz-answer.service.ts) — a pedido
 * explícito del usuario, para 2 cosas: (a) el admin puede ver qué
 * respondió cada quien (/admin/quiz-answers), y (b) cerrar el modal a
 * medio responder no pierde el progreso — al reabrir, este componente
 * pide lo ya guardado y arma el intento con esas preguntas más las que
 * hagan falta sorteadas del banco, nunca perdiendo lo ya contestado.
 */
export function QuizBlock({
  contentItemId,
  questions,
  onAllAnsweredChange,
  previewMode = false,
  questionsPerAttempt = QUESTIONS_PER_ATTEMPT,
  editorPreview = false,
}: {
  contentItemId: string;
  questions: QuizQuestion[];
  onAllAnsweredChange?: (allAnswered: boolean) => void;
  /**
   * true desde ContentForm.tsx (vista previa en vivo mientras se escribe
   * el quiz) o desde /admin/preview (Admin/Editor viendo el onboarding
   * como un rol, sin cambiar de cuenta) — en ninguno de los dos casos hay
   * progreso real de un usuario al cual atribuirle nada. Sin red: no lee
   * respuestas guardadas ni persiste ninguna — responder acá no debe
   * ensuciar /admin/quiz-answers con datos de prueba del admin.
   */
  previewMode?: boolean;
  /**
   * Cuántas preguntas mostrar de `questions` (ver QUESTIONS_PER_ATTEMPT).
   * ContentForm.tsx pasa `questions.length` acá (todo el banco, sin
   * sortear) — mientras se escribe el quiz, el admin necesita ver CADA
   * pregunta para revisar su formato, no un subconjunto al azar.
   * /admin/preview deja el default: ahí sí importa que se vea el mismo
   * subconjunto realista que vería un usuario real.
   */
  questionsPerAttempt?: number;
  /**
   * true solo desde ContentForm.tsx (implica previewMode): muestra el banco
   * completo en el orden escrito, sin barajar preguntas ni opciones, y marca
   * de entrada la opción correcta. Antes la vista previa del editor se
   * remontaba en cada tecla (key={text}) y rebarajaba todo, así que la
   * "Pregunta 1" de la vista previa no era la "Pregunta 1" de los campos.
   * El quiz real (y /admin/preview) sigue barajando igual que siempre.
   */
  editorPreview?: boolean;
}) {
  // null mientras se resuelve qué ya estaba respondido — armar el intento
  // sin esperar esto perdería justo el progreso que se quiere conservar.
  // En previewMode se arma de una, sin red (ver comentario del prop).
  const [state, setState] = useState<QuizState | null>(() =>
    editorPreview
      ? { shuffled: questions, answers: {} }
      : previewMode
      ? { shuffled: shuffleArray(questions).slice(0, questionsPerAttempt).map(shuffleQuestionOptions), answers: {} }
      : null,
  );

  useEffect(() => {
    if (previewMode || editorPreview) return;
    let cancelled = false;

    async function load() {
      let saved: { questionText: string; selectedOption: string }[] = [];
      try {
        const response = await fetch(`/api/progress/content/${contentItemId}/quiz-answers`);
        const body = await response.json();
        if (response.ok && body.success) saved = body.data.answers;
      } catch {
        // Sin conexión momentánea: mejor un quiz fresco que bloquear la
        // pantalla — en el peor caso se pide de nuevo algo ya respondido.
      }
      if (cancelled) return;

      const savedByQuestion = new Map(saved.map((a) => [a.questionText, a.selectedOption]));
      // Las ya respondidas SIEMPRE entran (retomar el intento), el resto
      // del cupo se sortea entre las que faltan — así nunca se pierde lo
      // ya contestado, aunque el sorteo en sí sea distinto cada vez.
      const alreadyAnswered = questions.filter((q) => savedByQuestion.has(q.question));
      const notYetAnswered = questions.filter((q) => !savedByQuestion.has(q.question));
      const remainingSlots = Math.max(0, questionsPerAttempt - alreadyAnswered.length);
      const picked = shuffleArray(notYetAnswered).slice(0, remainingSlots);

      const shuffled = [...alreadyAnswered, ...picked].map(shuffleQuestionOptions);
      const answers: Record<number, number> = {};
      shuffled.forEach((q, i) => {
        const savedOption = savedByQuestion.get(q.question);
        if (savedOption === undefined) return;
        const optionIndex = q.options.indexOf(savedOption);
        if (optionIndex !== -1) answers[i] = optionIndex;
      });

      setState({ shuffled, answers });
    }

    load();
    return () => {
      cancelled = true;
    };
    // Solo al montar — cada apertura del modal es un intento propio (el
    // modal desmonta este componente al cerrarse, ver OnboardingJourney).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shuffled = state?.shuffled ?? [];
  const answers = state?.answers ?? {};
  const answeredCount = Object.keys(answers).length;
  const correctCount = shuffled.filter((q, i) => answers[i] === q.correctIndex).length;

  useEffect(() => {
    if (!state) return; // todavía cargando: no avisar "completo" de mentira con 0/0
    // onAllAnsweredChange no entra en las deps a propósito: es un setState
    // del padre, su identidad cambia en cada render de OnboardingJourney sin
    // que eso deba re-disparar este efecto.
    onAllAnsweredChange?.(shuffled.length > 0 && answeredCount === shuffled.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, answeredCount, shuffled.length]);

  function handleAnswer(index: number, optionIndex: number) {
    const question = shuffled[index];
    if (!question) return;
    setState((prev) => (prev ? { ...prev, answers: { ...prev.answers, [index]: optionIndex } } : prev));
    if (previewMode || editorPreview) return; // no ensuciar /admin/quiz-answers con respuestas de prueba del admin
    fetch(`/api/progress/content/${contentItemId}/quiz-answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionText: question.question, selectedOption: question.options[optionIndex] }),
    }).catch(() => {});
  }

  if (!state) {
    return <p className="py-4 text-center text-sm text-ink-soft">Cargando preguntas…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {answeredCount > 0 && (
        <p className="text-xs font-semibold text-ink-soft">
          {correctCount}/{answeredCount} correctas · {answeredCount}/{shuffled.length} respondidas
        </p>
      )}
      {shuffled.map((q, i) => (
        <QuizQuestionCard
          key={editorPreview ? i : q.question}
          question={q}
          selected={answers[i] ?? null}
          revealCorrect={editorPreview}
          onAnswer={(optionIndex) => handleAnswer(i, optionIndex)}
        />
      ))}
    </div>
  );
}

function QuizQuestionCard({
  question,
  selected,
  onAnswer,
  revealCorrect = false,
}: {
  question: QuizQuestion;
  selected: number | null;
  onAnswer: (optionIndex: number) => void;
  /** Vista previa del editor: la correcta se marca antes de responder. */
  revealCorrect?: boolean;
}) {
  const answered = selected !== null;
  const isCorrect = selected === question.correctIndex;

  return (
    <div className="rounded-lg border border-line bg-paper/40 p-4 xl:p-5">
      <p className="mb-3 font-display text-base font-semibold leading-snug text-ink xl:text-lg">{question.question}</p>
      <div className="flex flex-col gap-2">
        {question.options.map((option, i) => {
          const isSelected = selected === i;
          const isTheCorrectOne = i === question.correctIndex;
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(i)}
              className={cn(
                "flex items-start gap-3 rounded-md border px-3.5 py-2.5 text-left text-sm font-medium text-ink transition-colors disabled:cursor-default",
                !answered && revealCorrect && isTheCorrectOne && "border-success bg-success-soft",
                !answered && !(revealCorrect && isTheCorrectOne) && "border-line bg-card hover:border-brand-soft hover:bg-brand-tint/40",
                answered && isSelected && isCorrect && "border-success bg-success-soft",
                answered && isSelected && !isCorrect && "border-danger bg-danger-soft",
                answered && !isSelected && "border-line bg-card opacity-60",
              )}
            >
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full border border-current text-[10px] font-bold">
                {LETTERS[i] ?? i + 1}
              </span>
              <span className="flex-1">{option}</span>
              {answered && isSelected && (isCorrect ? <Icon name="check" size="sm" className="mt-0.5 flex-none text-success" /> : null)}
              {(answered ? !isSelected : revealCorrect) && isTheCorrectOne && (
                <span className="mt-0.5 flex flex-none items-center gap-1 text-xs font-semibold text-success">
                  {!answered && "Correcta"}
                  <Icon name="check" size="sm" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className={cn("mt-3 rounded-md px-3.5 py-2.5 text-sm", isCorrect ? "bg-success-soft text-ink" : "bg-danger-soft text-ink")}>
          <strong>{isCorrect ? "¡Exacto! 🎉" : "Casi —"}</strong>
          {question.funFact ? ` ${question.funFact}` : !isCorrect ? ` La correcta era la ${LETTERS[question.correctIndex]}.` : ""}
        </p>
      )}
    </div>
  );
}
