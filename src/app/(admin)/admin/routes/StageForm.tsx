"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Select, Checkbox } from "@/components/Field";

type StageOption = { id: string; title: string };

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
    <Card as="form" onSubmit={handleSubmit} className="max-w-lg">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Nueva etapa</h2>
      <div className="flex flex-col gap-4">
        <Input id="stage-title" label="Título" required value={title} onChange={(event) => setTitle(event.target.value)} />
        <Input
          id="stage-order"
          label="Orden (opcional)"
          type="number"
          min={1}
          value={order}
          onChange={(event) => setOrder(event.target.value)}
        />
        <Select
          id="stage-depends"
          label="Depende de (opcional)"
          value={dependsOnStageId}
          onChange={(event) => setDependsOnStageId(event.target.value)}
        >
          <option value="">— Ninguna —</option>
          {existingStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.title}
            </option>
          ))}
        </Select>
        <Checkbox
          id="stage-blocking"
          label="Bloquea la siguiente etapa hasta completarse"
          checked={isBlocking}
          onChange={(event) => setIsBlocking(event.target.checked)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" isLoading={isSubmitting} className="self-start">
          Crear etapa
        </Button>
      </div>
    </Card>
  );
}
