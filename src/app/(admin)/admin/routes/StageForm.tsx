"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type StageOption = { id: string; title: string };

// Estructural, sin estilo definido.
export function StageForm({ existingStages }: { existingStages: StageOption[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [order, setOrder] = useState("");
  const [dependsOnStageId, setDependsOnStageId] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/stages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        order: order ? Number(order) : undefined,
        dependsOnStageId: dependsOnStageId || undefined,
        isBlocking,
      }),
    });
    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo crear la etapa.");
      return;
    }

    setTitle("");
    setOrder("");
    setDependsOnStageId("");
    setIsBlocking(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Nueva etapa</h2>
      <div>
        <label htmlFor="stage-title">Título</label>
        <input id="stage-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div>
        <label htmlFor="stage-order">Orden (opcional)</label>
        <input
          id="stage-order"
          type="number"
          min={1}
          value={order}
          onChange={(event) => setOrder(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="stage-depends">Depende de (opcional)</label>
        <select
          id="stage-depends"
          value={dependsOnStageId}
          onChange={(event) => setDependsOnStageId(event.target.value)}
        >
          <option value="">— Ninguna —</option>
          {existingStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="stage-blocking">
          <input
            id="stage-blocking"
            type="checkbox"
            checked={isBlocking}
            onChange={(event) => setIsBlocking(event.target.checked)}
          />
          Bloquea la siguiente etapa hasta completarse
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Creando…" : "Crear etapa"}
      </button>
    </form>
  );
}
