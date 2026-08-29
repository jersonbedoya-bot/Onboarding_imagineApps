"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Select, Checkbox } from "@/components/Field";

type StageOption = { id: string; title: string };

export type StageFormInitial = {
  title: string;
  order: number;
  dependsOnStageId: string;
  isBlocking: boolean;
};

export function StageForm({
  existingStages,
  mode = "create",
  stageId,
  initial,
  onSaved,
  variant = "card",
}: {
  existingStages: StageOption[];
  mode?: "create" | "edit";
  stageId?: string;
  initial?: StageFormInitial;
  onSaved?: () => void;
  variant?: "card" | "bare";
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [order, setOrder] = useState(initial ? String(initial.order) : "");
  const [dependsOnStageId, setDependsOnStageId] = useState(initial?.dependsOnStageId ?? "");
  const [isBlocking, setIsBlocking] = useState(initial?.isBlocking ?? false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Al editar, una etapa no puede depender de sí misma.
  const dependsOnOptions = mode === "edit" ? existingStages.filter((stage) => stage.id !== stageId) : existingStages;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const endpoint = mode === "edit" ? `/api/stages/${stageId}` : "/api/stages";
    const response = await fetch(endpoint, {
      method: mode === "edit" ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        order: order ? Number(order) : undefined,
        dependsOnStageId: dependsOnStageId || (mode === "edit" ? null : undefined),
        isBlocking,
      }),
    });
    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo guardar la etapa.");
      return;
    }

    if (mode === "edit") {
      onSaved?.();
    } else {
      setTitle("");
      setOrder("");
      setDependsOnStageId("");
      setIsBlocking(false);
    }
    router.refresh();
  }

  const fields = (
    <div className="flex flex-col gap-4">
      <Input id={`stage-title-${mode}`} label="Título" required value={title} onChange={(event) => setTitle(event.target.value)} />
      <Input
        id={`stage-order-${mode}`}
        label="Orden (opcional)"
        type="number"
        min={1}
        value={order}
        onChange={(event) => setOrder(event.target.value)}
      />
      <Select
        id={`stage-depends-${mode}`}
        label="Depende de (opcional)"
        value={dependsOnStageId}
        onChange={(event) => setDependsOnStageId(event.target.value)}
      >
        <option value="">— Ninguna —</option>
        {dependsOnOptions.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.title}
          </option>
        ))}
      </Select>
      <Checkbox
        id={`stage-blocking-${mode}`}
        label="Bloquea la siguiente etapa hasta completarse"
        checked={isBlocking}
        onChange={(event) => setIsBlocking(event.target.checked)}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" isLoading={isSubmitting} className="self-start">
        {mode === "edit" ? "Guardar cambios" : "Crear etapa"}
      </Button>
    </div>
  );

  if (variant === "bare") {
    return <form onSubmit={handleSubmit}>{fields}</form>;
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="max-w-lg">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Nuevo módulo</h2>
      {fields}
    </Card>
  );
}
