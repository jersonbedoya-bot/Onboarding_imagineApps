"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { QuizQuestion } from "@/lib/institutional-content";
import { cn } from "@/lib/cn";

const LETTERS = ["A", "B", "C", "D"];

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
  const options = [...question.options];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...question, options, correctIndex: options.indexOf(correctOption) };
}

/**
 * Quiz de opción múltiple, divertido y sin evaluación real (ver
 * institutional-content.ts): la respuesta CORRECTA no se exige — cualquier
 * opción cuenta como "respondida" — solo se exige responder las N
 * preguntas (pedido explícito del usuario, ver el gate en
 * OnboardingJourney: "Continuar al siguiente módulo" queda deshabilitado
 * hasta `answeredCount === questions.length`, y una vez respondido una
 * primera vez no se vuelve a exigir — ver quizAlreadyAnswered ahí mismo).
 * Nada de esto persiste en `user_progress` ni pasa por el backend acá
 * adentro — es puramente cliente (useState local por pregunta, se
 * resetea si el modal se cierra y se reabre), mismo criterio que la
 * maqueta de referencia (handleQuizAnswer en app.js): el objetivo sigue
 * siendo el momento lúdico, no un registro de "quién sabe qué" — solo que
 * ahora además hace de "cierre" obligatorio del módulo (la primera vez).
 */
export function QuizBlock({ questions, onAllAnsweredChange }: { questions: QuizQuestion[]; onAllAnsweredChange?: (allAnswered: boolean) => void }) {
  // Se baraja UNA sola vez por montaje (no en cada render, para que no
  // cambie el orden debajo de las respuestas ya elegidas) — como el modal
  // desmonta el componente al cerrarse, cada apertura trae un orden fresco.
  const [shuffled] = useState(() => questions.map(shuffleQuestionOptions));
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answeredCount = Object.keys(answers).length;
  const correctCount = shuffled.filter((q, i) => answers[i] === q.correctIndex).length;

  useEffect(() => {
    // onAllAnsweredChange no entra en las deps a propósito: es un setState
    // del padre, su identidad cambia en cada render de OnboardingJourney sin
    // que eso deba re-disparar este efecto.
    onAllAnsweredChange?.(answeredCount === shuffled.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredCount, shuffled.length]);

  return (
    <div className="flex flex-col gap-4">
      {answeredCount > 0 && (
        <p className="text-xs font-semibold text-ink-soft">
          {correctCount}/{answeredCount} correctas · {answeredCount}/{shuffled.length} respondidas
        </p>
      )}
      {shuffled.map((q, i) => (
        <QuizQuestionCard key={i} question={q} selected={answers[i] ?? null} onAnswer={(optionIndex) => setAnswers((prev) => ({ ...prev, [i]: optionIndex }))} />
      ))}
    </div>
  );
}

function QuizQuestionCard({
  question,
  selected,
  onAnswer,
}: {
  question: QuizQuestion;
  selected: number | null;
  onAnswer: (optionIndex: number) => void;
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
                !answered && "border-line bg-card hover:border-brand-soft hover:bg-brand-tint/40",
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
              {answered && !isSelected && isTheCorrectOne && <Icon name="check" size="sm" className="mt-0.5 flex-none text-success" />}
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
