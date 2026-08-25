"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Textarea } from "@/components/Field";

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
}: {
  processId: string;
  mode?: "create" | "edit";
  stepId?: string;
  initial?: StepFormInitial;
  onSaved?: () => void;
  variant?: "card" | "bare";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instruction, setInstruction] = useState(initial?.instruction ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [completionCriteria, setCompletionCriteria] = useState(initial?.completionCriteria ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
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
    }
    router.refresh();
  }

  const fields = (
    <div className="flex flex-col gap-4">
      <Input id={`step-title-${mode}`} label="Título" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <Textarea
        id={`step-description-${mode}`}
        label="Descripción"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <Textarea
        id={`step-instruction-${mode}`}
        label="Instrucción"
        value={instruction}
        onChange={(event) => setInstruction(event.target.value)}
      />
      <Input
        id={`step-video-${mode}`}
        label="Video (opcional, YouTube/Vimeo/Loom)"
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
    </div>
  );

  if (variant === "bare") {
    return <form onSubmit={handleSubmit}>{fields}</form>;
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="max-w-lg">
      <h3 className="mb-4 font-display text-lg font-semibold text-ink">Nuevo paso</h3>
      {fields}
    </Card>
  );
}
