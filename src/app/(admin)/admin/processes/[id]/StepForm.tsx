"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Field";
import { MarkdownTextarea } from "@/components/MarkdownTextarea";
import { ConfirmModal } from "@/components/ConfirmModal";
import { fieldsThatLostFormatting } from "@/lib/markdown-guard";
import { FormModalTrigger } from "@/components/admin/FormModalTrigger";

export type StepFormInitial = {
  title: string;
  description: string;
  instruction: string;
  videoUrl: string;
  completionCriteria: string;
};

export function StepForm({
  processId,
  mode = "create",
  stepId,
  initial,
  onSaved,
  variant = "card",
  triggerLabel = "+ Agregar paso",
  modalTitle = "Nuevo paso",
}: {
  processId: string;
  mode?: "create" | "edit";
  stepId?: string;
  initial?: StepFormInitial;
  onSaved?: () => void;
  variant?: "card" | "bare" | "modal";
  triggerLabel?: string;
  modalTitle?: string;
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instruction, setInstruction] = useState(initial?.instruction ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [completionCriteria, setCompletionCriteria] = useState(initial?.completionCriteria ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Campos en riesgo de haber perdido negrita/link al editar (ver
  // markdown-guard.ts) — no-null abre el segundo aviso antes de guardar.
  const [lossWarningFields, setLossWarningFields] = useState<string[] | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === "edit" && initial) {
      const atRisk = fieldsThatLostFormatting([
        { label: "Descripción", before: initial.description, after: description },
        { label: "Instrucción", before: initial.instruction, after: instruction },
      ]);
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

    const endpoint = mode === "edit" ? `/api/steps/${stepId}` : "/api/steps";
    const response = await fetch(endpoint, {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(mode === "create" ? { processId } : {}),
        title,
        description,
        instruction,
        videoUrl: videoUrl || (mode === "edit" ? null : undefined),
        completionCriteria,
      }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !result.success) {
      setError(result?.error?.message ?? "No se pudo guardar el paso.");
      return;
    }

    if (mode === "edit") {
      onSaved?.();
    } else {
      setTitle("");
      setDescription("");
      setInstruction("");
      setVideoUrl("");
      setCompletionCriteria("");
      setIsModalOpen(false);
    }
    router.refresh();
  }

  const fields = (
    <div className="flex flex-col gap-4">
      <Input id={`step-title-${mode}`} label="Título" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <MarkdownTextarea
        id={`step-description-${mode}`}
        label="Descripción (admite Markdown)"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <MarkdownTextarea
        id={`step-instruction-${mode}`}
        label="Instrucción (admite Markdown)"
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
      />
      <Input
        id={`step-video-${mode}`}
        label="Video (opcional, YouTube/Vimeo/Loom/Drive)"
        type="url"
        value={videoUrl}
        onChange={(event) => setVideoUrl(event.target.value)}
      />
      <Input
        id={`step-criteria-${mode}`}
        label="Criterio de finalización"
        value={completionCriteria}
        onChange={(event) => setCompletionCriteria(event.target.value)}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" isLoading={isSubmitting} className="self-start">
        {mode === "edit" ? "Guardar cambios" : "Crear paso"}
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
    <Card as="form" onSubmit={handleSubmit} className="max-w-lg">
      <h3 className="mb-4 font-display text-lg font-semibold text-ink">Nuevo paso</h3>
      {fields}
    </Card>
  );
}
