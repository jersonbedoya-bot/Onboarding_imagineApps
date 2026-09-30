"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CONTENT_ITEM_TYPES,
  CONTENT_REQUIREMENTS,
  CONTENT_DISPLAY_FORMATS,
  type ContentItemType,
  type ContentRequirement,
  type ContentDisplayFormat,
} from "@/types/enums";
import type { ReactNode } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Select, Checkbox } from "@/components/Field";
import { MarkdownTextarea } from "@/components/MarkdownTextarea";
import { MarkdownContent } from "@/components/MarkdownContent";
import { MediaUploader } from "@/components/MediaUploader";
import { ConfirmModal } from "@/components/ConfirmModal";
import { IconCardGrid } from "@/components/IconCardGrid";
import { CultureValuesGrid } from "@/components/CultureValuesGrid";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { QuizBlock } from "@/components/QuizBlock";
import { CONTENT_TYPE_LABELS, CONTENT_REQUIREMENT_LABELS, CONTENT_DISPLAY_FORMAT_LABELS, CONTENT_DISPLAY_FORMAT_HINTS } from "@/lib/content-labels";
import { fieldsThatLostFormatting } from "@/lib/markdown-guard";
import {
  splitFactGrid,
  factIcon,
  factBadgeIcon,
  splitValuesGrid,
  splitTimeline,
  splitSteps,
  stepNumberIcon,
  parseQuizQuestions,
} from "@/lib/content-display";
import { FormModalTrigger } from "@/components/admin/FormModalTrigger";
import { StructuredContentEditor } from "@/components/admin/StructuredContentEditor";
import { parseStructured, serializeStructured, emptyModel, type StructuredModel } from "@/lib/content-structure";

type RoleOption = { id: string; label: string };

export type ContentFormInitial = {
  title: string;
  body: string;
  type: ContentItemType;
  mediaId: string | null;
  videoUrl: string;
  scope: "COMMON" | "ROLE";
  roleIds: string[];
  requirement: ContentRequirement | "";
  displayFormat: ContentDisplayFormat;
};

export function ContentForm({
  stageId,
  roles,
  mode = "create",
  contentItemId,
  initial,
  onSaved,
  variant = "card",
  triggerLabel = "+ Agregar contenido",
  modalTitle = "Nuevo contenido",
}: {
  stageId: string;
  roles: RoleOption[];
  mode?: "create" | "edit";
  contentItemId?: string;
  initial?: ContentFormInitial;
  onSaved?: () => void;
  variant?: "card" | "bare" | "modal";
  triggerLabel?: string;
  modalTitle?: string;
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [type, setType] = useState<ContentItemType>(initial?.type ?? "TEXT");
  const [mediaId, setMediaId] = useState<string | null>(initial?.mediaId ?? null);
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [scope, setScope] = useState<"COMMON" | "ROLE">(initial?.scope ?? "COMMON");
  const [roleIds, setRoleIds] = useState<string[]>(initial?.roleIds ?? []);
  const [requirement, setRequirement] = useState<ContentRequirement | "">(initial?.requirement ?? "");
  const [displayFormat, setDisplayFormat] = useState<ContentDisplayFormat>(initial?.displayFormat ?? "PROSE");
  // Editor guiado (ver content-structure.ts): no-null = se edita por campos y
  // `body` se arma solo; null = modo texto (PROSE, o un body que no calza
  // con el formato y la persona prefirió no reemplazarlo).
  const [structured, setStructured] = useState<StructuredModel | null>(() => {
    const format = initial?.displayFormat ?? "PROSE";
    return format === "PROSE" ? null : parseStructured(format, initial?.body ?? "");
  });
  const [isConfirmingGuidedReplace, setIsConfirmingGuidedReplace] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Cambiar esta key remonta <MediaUploader/> desde cero — es la única
  // forma de limpiar su preview/estado interno, que vive fuera de este
  // form (ver src/components/MediaUploader.tsx).
  const [mediaUploaderKey, setMediaUploaderKey] = useState(0);
  // Campos en riesgo de haber perdido negrita/link al editar (ver
  // markdown-guard.ts) — no-null abre el segundo aviso antes de guardar.
  const [lossWarningFields, setLossWarningFields] = useState<string[] | null>(null);

  const needsMedia = type === "IMAGE" || type === "MIXED";
  const needsVideo = type === "VIDEO" || type === "MIXED";

  // Vista previa REAL del formato elegido (no solo Markdown genérico) —
  // así la admin ve de inmediato si su texto arma el grid/timeline/quiz
  // esperado, en vez de enterarse recién en /onboarding. Si el body no
  // calza con el patrón del formato, se cae al mismo MarkdownContent
  // normal que usaría la vista real (nunca se rompe la vista previa) y se
  // avisa aparte (ver formatMismatch más abajo) — sin esto, "el formato no
  // se aplicó" pasaba desapercibido: se veía como texto plano sin ninguna
  // pista de por qué.
  function renderContentPreview(text: string): ReactNode {
    switch (displayFormat) {
      case "FACT_GRID": {
        const split = splitFactGrid(text);
        if (!split) break;
        return (
          <>
            {split.intro && <MarkdownContent>{split.intro}</MarkdownContent>}
            <IconCardGrid
              items={split.items.map((fact) => ({
                icon: fact.badge ? factBadgeIcon(fact.badge) : factIcon(fact.title),
                title: fact.title,
                href: fact.href,
                badge: fact.badge,
                description: fact.description,
              }))}
            />
            {split.outro && <MarkdownContent className="mt-3">{split.outro}</MarkdownContent>}
          </>
        );
      }
      case "VALUES_GRID": {
        const split = splitValuesGrid(text);
        if (!split) break;
        return (
          <>
            {split.intro && <MarkdownContent>{split.intro}</MarkdownContent>}
            <CultureValuesGrid values={split.values} />
          </>
        );
      }
      case "TIMELINE": {
        const split = splitTimeline(text);
        if (!split) break;
        return (
          <>
            {split.intro && <MarkdownContent>{split.intro}</MarkdownContent>}
            <HistoryTimeline items={split.items} />
            {split.outro && <MarkdownContent className="mt-3">{split.outro}</MarkdownContent>}
          </>
        );
      }
      case "STEPS": {
        const split = splitSteps(text);
        if (!split) break;
        return (
          <>
            {split.intro && <MarkdownContent>{split.intro}</MarkdownContent>}
            <IconCardGrid items={split.steps.map((description, i) => ({ icon: stepNumberIcon(i), description }))} />
            {split.outro && <MarkdownContent className="mt-3">{split.outro}</MarkdownContent>}
          </>
        );
      }
      case "QUIZ": {
        const questions = parseQuizQuestions(text);
        // key={text}: sin esto React reusa la misma instancia de QuizBlock
        // mientras se edita (mismo lugar en el árbol) y su estado interno
        // (barajado + respuestas) queda pegado al primer montaje — remonta
        // en cada cambio para que la vista previa siempre refleje el texto
        // actual, no el de cuando se abrió el formulario.
        if (!questions) break;
        return <QuizBlock key={text} contentItemId="" questions={questions} previewMode questionsPerAttempt={questions.length} />;
      }
    }
    return <MarkdownContent>{text}</MarkdownContent>;
  }

  // Recalcula si el formato elegido realmente calza con el body actual —
  // barato (regex sobre un texto corto), y mucho más claro que inspeccionar
  // el resultado de renderContentPreview para adivinarlo.
  function formatAppliesTo(text: string): boolean {
    switch (displayFormat) {
      case "FACT_GRID":
        return splitFactGrid(text) !== null;
      case "VALUES_GRID":
        return splitValuesGrid(text) !== null;
      case "TIMELINE":
        return splitTimeline(text) !== null;
      case "STEPS":
        return splitSteps(text) !== null;
      case "QUIZ":
        return parseQuizQuestions(text) !== null;
      default:
        return true;
    }
  }
  const formatMismatch = displayFormat !== "PROSE" && body.trim().length > 0 && !formatAppliesTo(body);

  function updateStructured(next: StructuredModel) {
    setStructured(next);
    setBody(serializeStructured(next));
  }

  function handleFormatChange(next: ContentDisplayFormat) {
    setDisplayFormat(next);
    // Con un body que ya calza con el formato nuevo (o vacío), se abre el
    // editor guiado con esos datos; si no calza, se queda en modo texto y
    // se ofrece empezar de cero — nunca se borra lo escrito sin avisar.
    setStructured(next === "PROSE" ? null : parseStructured(next, body));
  }

  function switchToGuided() {
    if (displayFormat === "PROSE") return;
    const parsed = parseStructured(displayFormat, body);
    if (parsed) setStructured(parsed);
    else setIsConfirmingGuidedReplace(true);
  }

  function startGuidedFromScratch() {
    if (displayFormat === "PROSE") return;
    updateStructured(emptyModel(displayFormat));
    setIsConfirmingGuidedReplace(false);
  }

  function toggleRole(roleId: string) {
    setRoleIds((current) => (current.includes(roleId) ? current.filter((id) => id !== roleId) : [...current, roleId]));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (structured && !body.trim()) {
      setError("Completa al menos una fila del editor (las filas incompletas no se guardan).");
      return;
    }
    if (needsMedia && !mediaId) {
      setError("Todavía no subiste la imagen (o la subida falló) — sube un archivo antes de guardar.");
      return;
    }
    if (type === "VIDEO" && !videoUrl) {
      setError("Completa la URL del video antes de guardar.");
      return;
    }

    if (mode === "edit" && initial) {
      const atRisk = fieldsThatLostFormatting([{ label: "Cuerpo", before: initial.body, after: body }]);
      if (atRisk.length > 0) {
        setLossWarningFields(atRisk);
        return;
      }
    }

    await performSave();
  }

  async function performSave() {
    setLossWarningFields(null);
    setIsSubmitting(true);

    const endpoint = mode === "edit" ? `/api/content/${contentItemId}` : "/api/content";
    const response = await fetch(endpoint, {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(mode === "create" ? { stageId } : {}),
        type,
        scope,
        roleIds: scope === "ROLE" ? roleIds : [],
        title,
        body,
        mediaId: mediaId || (mode === "edit" ? null : undefined),
        videoUrl: videoUrl || (mode === "edit" ? null : undefined),
        requirement: requirement || null,
        displayFormat,
      }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !result.success) {
      setError(result?.error?.message ?? "No se pudo guardar el contenido.");
      return;
    }

    if (mode === "edit") {
      onSaved?.();
    } else {
      setTitle("");
      setBody("");
      setType("TEXT");
      setMediaId(null);
      setVideoUrl("");
      setScope("COMMON");
      setRoleIds([]);
      setRequirement("");
      setDisplayFormat("PROSE");
      setStructured(null);
      setMediaUploaderKey((key) => key + 1);
      setIsModalOpen(false);
    }
    router.refresh();
  }

  // Agrupado en 3 bloques (Contenido / Tipo y medios / Visibilidad) en vez
  // de una sola columna larga de 8 controles sin separación — el modal
  // angosto de antes hacía que esto se sintiera saturado para un admin no
  // técnico. Cada bloque lleva su propio subtítulo mudo (mismo estilo que
  // ya usaba el legend de "Alcance") y un separador sutil entre bloques.
  const fields = (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-soft">Contenido</h4>
        <Input id="content-title" label="Título" required value={title} onChange={(event) => setTitle(event.target.value)} />
        {/* El formato va ANTES del cuerpo: define qué editor aparece abajo. */}
        <Select
          id="content-display-format"
          label="Formato de visualización"
          value={displayFormat}
          onChange={(event) => handleFormatChange(event.target.value as ContentDisplayFormat)}
        >
          {CONTENT_DISPLAY_FORMATS.map((option) => (
            <option key={option} value={option}>
              {CONTENT_DISPLAY_FORMAT_LABELS[option]}
            </option>
          ))}
        </Select>

        {structured ? (
          <>
            <p className="-mt-2 text-xs text-ink-soft">Completa los campos: el diseño se arma solo, sin escribir ningún símbolo.</p>
            <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
              <StructuredContentEditor value={structured} onChange={updateStructured} />
              <div className="flex flex-col gap-1 md:sticky md:top-0 md:self-start">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">Vista previa</span>
                <div className="min-h-[88px] rounded-md border border-line bg-paper px-3 py-2">
                  {body.trim() ? renderContentPreview(body) : <p className="text-sm text-ink-soft/60">Completa una fila para ver cómo queda.</p>}
                </div>
              </div>
            </div>
            <button type="button" onClick={() => setStructured(null)} className="self-start text-xs font-semibold text-ink-soft hover:text-brand-strong">
              Editar como texto (avanzado)
            </button>
          </>
        ) : (
          <>
            {displayFormat !== "PROSE" && <p className="-mt-2 text-xs text-ink-soft">{CONTENT_DISPLAY_FORMAT_HINTS[displayFormat]}</p>}
            <MarkdownTextarea
              id="content-body"
              label="Cuerpo (admite Markdown)"
              required
              value={body}
              onChange={(event) => setBody(event.target.value)}
              renderPreview={renderContentPreview}
            />
            {formatMismatch && (
              <p className="-mt-2 flex items-start gap-1.5 text-xs font-semibold text-danger">
                <span aria-hidden>⚠</span>
                Todavía no calza con &quot;{CONTENT_DISPLAY_FORMAT_LABELS[displayFormat]}&quot; — por ahora se muestra como texto normal (ver la vista previa).
              </p>
            )}
            {displayFormat !== "PROSE" && (
              <button type="button" onClick={switchToGuided} className="self-start text-xs font-semibold text-brand-strong hover:underline">
                Usar el editor guiado
              </button>
            )}
          </>
        )}
        <ConfirmModal
          open={isConfirmingGuidedReplace}
          title="¿Empezar con el editor guiado?"
          description={`El texto actual no tiene la forma de "${CONTENT_DISPLAY_FORMAT_LABELS[displayFormat]}", así que el editor guiado no puede leerlo. Si continúas, empiezas con los campos vacíos y ese texto se reemplaza al guardar.`}
          confirmLabel="Empezar de cero"
          tone="neutral"
          onConfirm={startGuidedFromScratch}
          onClose={() => setIsConfirmingGuidedReplace(false)}
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-soft">Tipo y medios</h4>
        <Select id="content-type" label="Tipo" value={type} onChange={(event) => setType(event.target.value as ContentItemType)}>
          {CONTENT_ITEM_TYPES.map((option) => (
            <option key={option} value={option}>
              {CONTENT_TYPE_LABELS[option]}
            </option>
          ))}
        </Select>
        {(type === "VIDEO" || type === "IMAGE" || type === "MIXED") && (
          <p className="-mt-2 text-xs text-ink-soft">Elegiste {CONTENT_TYPE_LABELS[type]}: completa el video y/o la imagen abajo.</p>
        )}

        {needsMedia && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Imagen</span>
            <MediaUploader key={mediaUploaderKey} onUploaded={(id) => setMediaId(id)} />
          </div>
        )}
        {needsVideo && (
          <div className="flex flex-col gap-1">
            <Input
              id="content-video"
              label="Video (YouTube/Vimeo/Loom/Drive)"
              type="url"
              required={type === "VIDEO"}
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://youtube.com/watch?v=..."
            />
            <p className="text-xs text-ink-soft">
              Si usas Google Drive, comparte el archivo con &quot;Cualquier persona con el enlace&quot; para que se
              pueda reproducir.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-6">
        <h4 className="text-xs font-bold uppercase tracking-wide text-ink-soft">Visibilidad</h4>
        <Select
          id="content-requirement"
          label="Requisito"
          value={requirement}
          onChange={(event) => setRequirement(event.target.value as ContentRequirement | "")}
        >
          <option value="">— Ninguno (no aparece como acción para el usuario) —</option>
          {CONTENT_REQUIREMENTS.map((option) => (
            <option key={option} value={option}>
              {CONTENT_REQUIREMENT_LABELS[option]}
            </option>
          ))}
        </Select>
        {requirement === "OBLIGATORY" && (
          <p className="-mt-2 text-xs text-ink-soft">
            El nuevo empleado va a ver un botón &quot;Marcar como leído&quot; en /onboarding para este contenido.
          </p>
        )}

        <fieldset className="flex flex-col gap-2 rounded-md border border-line p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Alcance</legend>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name={`content-scope-${mode}`}
              checked={scope === "COMMON"}
              onChange={() => setScope("COMMON")}
              className="h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand/30"
            />
            Común (todos los roles)
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name={`content-scope-${mode}`}
              checked={scope === "ROLE"}
              onChange={() => setScope("ROLE")}
              className="h-4 w-4 border-line text-brand focus:ring-2 focus:ring-brand/30"
            />
            Específico por rol
          </label>
          {scope === "ROLE" && (
            <div className="ml-6 flex flex-col gap-1.5 border-l border-line pl-3">
              {roles.map((role) => (
                <Checkbox
                  key={role.id}
                  id={`content-role-${mode}-${role.id}`}
                  label={role.label}
                  checked={roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                />
              ))}
            </div>
          )}
        </fieldset>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" isLoading={isSubmitting} className="self-start">
        {mode === "edit" ? "Guardar cambios" : "Crear contenido"}
      </Button>
      <ConfirmModal
        open={lossWarningFields !== null}
        title="¿Guardar de todos modos?"
        description={`El campo "${lossWarningFields?.join(", ")}" parece haber perdido una negrita o un enlace que tenía antes — revisa el panel "Vista previa" antes de continuar.`}
        confirmLabel="Guardar igual"
        tone="neutral"
        isLoading={isSubmitting}
        onConfirm={performSave}
        onClose={() => setLossWarningFields(null)}
      />
    </div>
  );

  if (variant === "bare") {
    return <form onSubmit={handleSubmit}>{fields}</form>;
  }

  if (variant === "modal") {
    return (
      <FormModalTrigger
        triggerLabel={triggerLabel}
        modalTitle={modalTitle}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        maxWidthClassName="max-w-4xl"
      >
        <form onSubmit={handleSubmit}>{fields}</form>
      </FormModalTrigger>
    );
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="mt-6 max-w-lg">
      <h3 className="mb-4 font-display text-lg font-semibold text-ink">Nuevo contenido en este módulo</h3>
      {fields}
    </Card>
  );
}
