"use client";

import { useId, type ReactNode } from "react";
import { Input, Textarea, FIELD_BASE, fieldBorder } from "@/components/Field";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";
import { emptyQuizQuestion, quizQuestionProblem, type StructuredModel } from "@/lib/content-structure";
import type { FactItem } from "@/lib/content-display";

/**
 * Editor guiado por formato (ver content-structure.ts): en vez de escribir
 * Markdown con un patrón exacto, la persona llena campos — pregunta y
 * opciones para un quiz, año/título/descripción para una cronología — y
 * el body se arma solo. Mismo resultado que el modo texto, sin símbolos.
 */
export function StructuredContentEditor({ value, onChange }: { value: StructuredModel; onChange: (next: StructuredModel) => void }) {
  // Ids únicos para enlazar cada etiqueta con su campo (lectores de pantalla y clic en la etiqueta).
  const uid = useId();
  switch (value.format) {
    case "FACT_GRID": {
      const m = value.model;
      const set = (patch: Partial<typeof m>) => onChange({ format: "FACT_GRID", model: { ...m, ...patch } });
      return (
        <div className="flex flex-col gap-4">
          <IntroField id={`${uid}-intro`} value={m.intro} onChange={(intro) => set({ intro })} label="Texto antes de las tarjetas (opcional)" />
          <RowList<FactItem> idPrefix={uid}
            items={m.items}
            onChange={(items) => set({ items })}
            makeEmpty={() => ({ title: "", description: "" })}
            addLabel="+ Agregar tarjeta"
            itemLabel="Tarjeta"
            incomplete={(item) => (!item.title.trim() || !item.description.trim() ? "Esta tarjeta no se guarda hasta que tenga título y descripción." : null)}
            render={(item, update, rid) => (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input id={`${rid}-title`} label="Título" value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
                  <Input id={`${rid}-badge`}
                    label="Etiqueta (opcional)"
                    placeholder="Ej. Salud, Banca…"
                    value={item.badge ?? ""}
                    onChange={(e) => update({ ...item, badge: e.target.value || undefined })}
                  />
                </div>
                <Textarea id={`${rid}-desc`} label="Descripción" rows={2} value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} />
                <Input id={`${rid}-href`}
                  label="Enlace del título (opcional)"
                  type="url"
                  placeholder="https://…"
                  value={item.href ?? ""}
                  onChange={(e) => update({ ...item, href: e.target.value || null })}
                />
              </>
            )}
          />
          <IntroField id={`${uid}-outro`} value={m.outro} onChange={(outro) => set({ outro })} label="Texto después de las tarjetas (opcional)" />
        </div>
      );
    }
    case "VALUES_GRID": {
      const m = value.model;
      const set = (patch: Partial<typeof m>) => onChange({ format: "VALUES_GRID", model: { ...m, ...patch } });
      return (
        <div className="flex flex-col gap-4">
          <IntroField id={`${uid}-intro`} value={m.intro} onChange={(intro) => set({ intro })} label="Texto antes de los valores (opcional)" />
          <RowList idPrefix={uid}
            items={m.values}
            onChange={(values) => set({ values })}
            makeEmpty={() => ({ title: "", description: "" })}
            addLabel="+ Agregar valor"
            itemLabel="Valor"
            incomplete={(item) => (!item.title.trim() || !item.description.trim() ? "Este valor no se guarda hasta que tenga nombre y descripción." : null)}
            render={(item, update, rid) => (
              <>
                <Input id={`${rid}-name`} label="Nombre del valor" value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
                <Textarea id={`${rid}-meaning`}
                  label="Qué significa (se muestra al hacer clic)"
                  rows={2}
                  value={item.description}
                  onChange={(e) => update({ ...item, description: e.target.value })}
                />
              </>
            )}
          />
        </div>
      );
    }
    case "TIMELINE": {
      const m = value.model;
      const set = (patch: Partial<typeof m>) => onChange({ format: "TIMELINE", model: { ...m, ...patch } });
      return (
        <div className="flex flex-col gap-4">
          <IntroField id={`${uid}-intro`} value={m.intro} onChange={(intro) => set({ intro })} label="Texto antes de la línea de tiempo (opcional)" />
          <RowList idPrefix={uid}
            items={m.items}
            onChange={(items) => set({ items })}
            makeEmpty={() => ({ year: "", title: "", description: "" })}
            addLabel="+ Agregar hito"
            itemLabel="Hito"
            incomplete={(item) =>
              !item.year.trim() || !item.title.trim() || !item.description.trim() ? "Este hito no se guarda hasta que tenga año, título y descripción." : null
            }
            render={(item, update, rid) => (
              <>
                <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                  <Input id={`${rid}-year`} label="Año" placeholder="2020" value={item.year} onChange={(e) => update({ ...item, year: e.target.value })} />
                  <Input id={`${rid}-title`} label="Título" value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} />
                </div>
                <Textarea id={`${rid}-what`} label="Qué pasó" rows={2} value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} />
              </>
            )}
          />
          <IntroField id={`${uid}-outro`} value={m.outro} onChange={(outro) => set({ outro })} label="Texto después de la línea de tiempo (opcional)" />
        </div>
      );
    }
    case "STEPS": {
      const m = value.model;
      const set = (patch: Partial<typeof m>) => onChange({ format: "STEPS", model: { ...m, ...patch } });
      const filled = m.steps.filter((s) => s.trim()).length;
      return (
        <div className="flex flex-col gap-4">
          <IntroField id={`${uid}-intro`} value={m.intro} onChange={(intro) => set({ intro })} label="Texto antes de los pasos (opcional)" />
          <RowList idPrefix={uid}
            items={m.steps}
            onChange={(steps) => set({ steps })}
            makeEmpty={() => ""}
            addLabel="+ Agregar paso"
            itemLabel="Paso"
            numbered
            incomplete={(step) => (!step.trim() ? "Este paso está vacío y no se va a guardar." : null)}
            render={(step, update, rid) => (
              <Textarea id={`${rid}-step`} aria-label="Qué hay que hacer" rows={2} value={step} onChange={(e) => update(e.target.value)} placeholder="Una instrucción completa" />
            )}
          />
          {filled < 2 && <p className="text-xs font-semibold text-danger">⚠ Un procedimiento necesita al menos 2 pasos con texto para mostrarse como pasos numerados.</p>}
          <IntroField id={`${uid}-outro`} value={m.outro} onChange={(outro) => set({ outro })} label="Texto después de los pasos (opcional)" />
        </div>
      );
    }
    case "QUIZ": {
      const questions = value.model.questions;
      const set = (next: typeof questions) => onChange({ format: "QUIZ", model: { questions: next } });
      return (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-ink-soft">
            Este es el banco de preguntas: en cada intento, cada persona responde 5 elegidas al azar. Cuantas más agregues, más
            variado será.
          </p>
          <RowList idPrefix={uid}
            items={questions}
            onChange={set}
            makeEmpty={emptyQuizQuestion}
            addLabel="+ Agregar pregunta"
            itemLabel="Pregunta"
            numbered
            incomplete={quizQuestionProblem}
            render={(q, update, rid) => (
              <>
                <Textarea id={`${rid}-question`} label="Pregunta" rows={2} value={q.question} onChange={(e) => update({ ...q, question: e.target.value })} />
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Opciones — marca la correcta</legend>
                  {q.options.map((option, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${rid}-correct`}
                        aria-label={`Marcar la opción ${oi + 1} como correcta`}
                        checked={q.correctIndex === oi}
                        onChange={() => update({ ...q, correctIndex: oi })}
                        className="h-4 w-4 flex-shrink-0 accent-[var(--color-brand)]"
                      />
                      {/* textarea de 2 líneas (no Input): las opciones suelen ser frases largas y se cortaban. */}
                      <textarea
                        aria-label={`Opción ${oi + 1}`}
                        rows={2}
                        value={option}
                        onChange={(e) => update({ ...q, options: q.options.map((o, j) => (j === oi ? e.target.value : o)) })}
                        className={cn(FIELD_BASE, "resize-y", q.correctIndex === oi ? "border-success" : fieldBorder(false))}
                        placeholder={q.correctIndex === oi ? "Respuesta correcta" : "Opción incorrecta"}
                      />
                      <IconButton
                        label="Quitar esta opción"
                        disabled={q.options.length <= 2}
                        onClick={() => {
                          const options = q.options.filter((_, j) => j !== oi);
                          const correctIndex = q.correctIndex === oi ? 0 : q.correctIndex > oi ? q.correctIndex - 1 : q.correctIndex;
                          update({ ...q, options, correctIndex });
                        }}
                      >
                        <Icon name="close" size="sm" />
                      </IconButton>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => update({ ...q, options: [...q.options, ""] })}
                    className="self-start text-xs font-semibold text-brand-strong hover:underline"
                  >
                    + Agregar opción
                  </button>
                </fieldset>
                <Input id={`${rid}-funfact`}
                  label="Dato curioso (opcional)"
                  placeholder="Se muestra después de responder, acierte o no"
                  value={q.funFact ?? ""}
                  onChange={(e) => update({ ...q, funFact: e.target.value })}
                />
              </>
            )}
          />
        </div>
      );
    }
  }
}

function IntroField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Textarea id={id} label={label} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="text-xs text-ink-soft/80">Texto libre. Opcional: si quieres un subtítulo, empieza esa línea con «### ».</p>
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-brand hover:text-brand-strong disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Lista genérica de filas con subir/bajar/quitar — la misma para tarjetas, hitos, pasos y preguntas. */
function RowList<T>({
  items,
  onChange,
  makeEmpty,
  render,
  addLabel,
  itemLabel,
  incomplete,
  numbered = false,
  idPrefix,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  makeEmpty: () => T;
  render: (item: T, update: (next: T) => void, rowId: string) => ReactNode;
  addLabel: string;
  itemLabel: string;
  incomplete: (item: T) => string | null;
  numbered?: boolean;
  idPrefix: string;
}) {
  function move(from: number, to: number) {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const problem = incomplete(item);
        return (
          <div key={i} className={cn("flex flex-col gap-3 rounded-lg border bg-paper p-4", problem ? "border-dashed border-line" : "border-line")}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                {itemLabel} {numbered || items.length > 1 ? i + 1 : ""}
              </span>
              <div className="flex items-center gap-1">
                <IconButton label="Subir" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <Icon name="chevron-left" size="sm" className="rotate-90" />
                </IconButton>
                <IconButton label="Bajar" disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                  <Icon name="chevron-right" size="sm" className="rotate-90" />
                </IconButton>
                <IconButton label={`Quitar ${itemLabel.toLowerCase()}`} disabled={items.length <= 1} onClick={() => onChange(items.filter((_, j) => j !== i))}>
                  <Icon name="trash" size="sm" />
                </IconButton>
              </div>
            </div>
            {render(item, (next) => onChange(items.map((current, j) => (j === i ? next : current))), `${idPrefix}-${i}`)}
            {problem && <p className="text-xs text-ink-soft">⚠ {problem}</p>}
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onChange([...items, makeEmpty()])}
        className="self-start rounded-full border border-dashed border-line px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-brand hover:text-brand-strong"
      >
        {addLabel}
      </button>
    </div>
  );
}
