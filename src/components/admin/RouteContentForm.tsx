"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Textarea } from "@/components/Field";

/** Título/subtítulo del header "Vamos paso a paso" de /onboarding — ver route.service.getRouteHeader. */
export function RouteContentForm({ headline, subtitle }: { headline: string; subtitle: string }) {
  const router = useRouter();
  const [headlineValue, setHeadlineValue] = useState(headline);
  const [subtitleValue, setSubtitleValue] = useState(subtitle);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/route", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline: headlineValue, subtitle: subtitleValue }),
    });
    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo guardar el título.");
      return;
    }
    router.refresh();
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="max-w-lg">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Título del recorrido</h2>
      <p className="mb-4 text-sm text-ink-soft">Es el encabezado que ve cualquier usuario arriba de /onboarding.</p>
      <div className="flex flex-col gap-4">
        <Input
          id="route-headline"
          label="Título"
          required
          value={headlineValue}
          onChange={(event) => setHeadlineValue(event.target.value)}
        />
        <Textarea
          id="route-subtitle"
          label="Subtítulo (opcional)"
          rows={2}
          value={subtitleValue}
          onChange={(event) => setSubtitleValue(event.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" isLoading={isSubmitting} className="self-start">
          Guardar cambios
        </Button>
      </div>
    </Card>
  );
}
