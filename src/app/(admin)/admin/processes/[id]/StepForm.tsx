"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

// Estructural, sin estilo definido.
export function StepForm({ processId }: { processId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instruction, setInstruction] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [completionCriteria, setCompletionCriteria] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        processId,
        title,
        description,
        instruction,
        videoUrl: videoUrl || undefined,
        completionCriteria,
      }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !result.success) {
      setError(result?.error?.message ?? "No se pudo crear el paso.");
      return;
    }

    setTitle("");
    setDescription("");
    setInstruction("");
    setVideoUrl("");
    setCompletionCriteria("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>Nuevo paso</h3>
      <div>
        <label htmlFor="step-title">Título</label>
        <input id="step-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div>
        <label htmlFor="step-description">Descripción</label>
        <textarea id="step-description" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <div>
        <label htmlFor="step-instruction">Instrucción</label>
        <textarea id="step-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} />
      </div>
      <div>
        <label htmlFor="step-video">Video (opcional, YouTube/Vimeo/Loom)</label>
        <input id="step-video" type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} />
      </div>
      <div>
        <label htmlFor="step-criteria">Criterio de finalización</label>
        <input
          id="step-criteria"
          value={completionCriteria}
          onChange={(event) => setCompletionCriteria(event.target.value)}
        />
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creando…" : "Crear paso"}
      </button>
    </form>
  );
}
