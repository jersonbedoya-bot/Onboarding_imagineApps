"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { QuizQuestion } from "@/lib/institutional-content";
import { cn } from "@/lib/cn";

const LETTERS = ["A", "B", "C", "D"];

/**
 * Quiz de opción múltiple, divertido y sin evaluación real (ver
 * institutional-content.ts): responder no persiste nada ni afecta el
 * progreso — el content item que lo contiene ya se marca visto por
 * ContentViewTracker como cualquier otro item INFORMATIONAL. Es puramente
 * cliente (useState local por pregunta), a propósito: mismo criterio que la
 * maqueta de referencia (handleQuizAnswer en app.js), donde el objetivo es
 * el momento lúdico, no un registro de "quién sabe qué".
 */
export function QuizBlock({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.filter((q, i) => answers[i] === q.correctIndex).length;

  return (
    <div className="flex flex-col gap-4">
      {answeredCount > 0 && (
        <p className="text-xs font-semibold text-ink-soft">
          {correctCount}/{answeredCount} correctas · {answeredCount}/{questions.length} respondidas
        </p>
      )}
      {questions.map((q, i) => (
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
