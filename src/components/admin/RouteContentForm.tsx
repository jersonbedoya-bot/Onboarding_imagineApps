"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input, Textarea, Checkbox } from "@/components/Field";

export type GuideMessageValue = { text: string; enabled: boolean };

export type PendingContentSummary = { contentItems: string[]; processes: string[]; steps: string[] };

/**
 * Editor de todo el contenido "de guía" del recorrido: el título/subtítulo
 * del header de /onboarding (route.service.getRouteHeader de antes) más los
 * 2 mensajes que hasta ahora vivían quemados en OnboardingJourney.tsx
 * ("Completa lo pendiente..." y el aviso de contenido en revisión) — ver
 * route.service.getRouteContent. Vive en /admin/messages, no en
 * /admin/modules: es contenido editorial del recorrido completo, no de un
 * módulo puntual.
 *
 * El título/subtítulo tiene vista previa en vivo (mismas clases que el
 * header real, ver page.tsx) porque es un bloque grande y vistoso — vale la
 * pena ver el resultado antes de guardar. Los 2 mensajes de guía son textos
 * chicos de una sola línea: alcanza con un toggle "Mostrar" + una vista
 * previa en texto, sin reproducir un componente entero.
 *
 * Cada campo aclara DÓNDE exactamente se ve en /onboarding (pedido
 * explícito del usuario: "no se tiene bien conocimiento de dónde se
 * modifica la información") — y el header lleva un link directo a
 * /admin/preview para verlo en el recorrido real, sin tener que adivinar.
 */
export function RouteContentForm({
  headline,
  subtitle,
  blockedNextMessage,
  pendingContentMessage,
  pendingSummary,
}: {
  headline: string;
  subtitle: string;
  blockedNextMessage: GuideMessageValue;
  pendingContentMessage: GuideMessageValue;
  pendingSummary: PendingContentSummary;
}) {
  const router = useRouter();
  const [headlineValue, setHeadlineValue] = useState(headline);
  const [subtitleValue, setSubtitleValue] = useState(subtitle);
  const [blockedNextText, setBlockedNextText] = useState(blockedNextMessage.text);
  const [blockedNextEnabled, setBlockedNextEnabled] = useState(blockedNextMessage.enabled);
  const [pendingText, setPendingText] = useState(pendingContentMessage.text);
  const [pendingEnabled, setPendingEnabled] = useState(pendingContentMessage.enabled);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/route", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        headline: headlineValue,
        subtitle: subtitleValue,
        blockedNextMessage: blockedNextText,
        blockedNextMessageEnabled: blockedNextEnabled,
        pendingContentMessage: pendingText,
        pendingContentMessageEnabled: pendingEnabled,
      }),
    });
    const body = await response.json();
    setIsSubmitting(false);

    if (!response.ok || !body.success) {
      setError(body?.error?.message ?? "No se pudo guardar los cambios.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card className="max-w-3xl">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Título del recorrido</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Es el encabezado grande de arriba de todo en <strong>/onboarding</strong> — pero solo la primera vez que alguien
          entra a su primer módulo. Al volver más adelante (fase 2, 3…) ya no se muestra, para no repetir la bienvenida en
          cada visita.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
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
          </div>
          {/* Vista previa: mismas clases que el header real en (user)/onboarding/page.tsx */}
          <div className="flex flex-col justify-center rounded-2xl border border-brand-soft bg-gradient-to-br from-brand-tint to-card px-5 py-6">
            <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-strong">
              Tu recorrido
            </span>
            <p className="text-gradient-brand font-display text-2xl font-semibold leading-tight">{headlineValue || "…"}</p>
            {subtitleValue && <p className="mt-2 text-sm text-ink-soft">{subtitleValue}</p>}
          </div>
        </div>
      </Card>

      <Card className="max-w-3xl">
        <h2 className="mb-1 font-display text-lg font-semibold text-ink">Mensajes de guía</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Textos de orientación cortos que aparecen dentro del recorrido — desactívalos si no quieres mostrarlos, o cambia su
          redacción. Cada uno aclara abajo exactamente dónde se ve.
        </p>
        <div className="flex flex-col gap-4">
          <GuideMessageField
            id="blocked-next"
            label="Módulo siguiente bloqueado"
            hint='Reemplaza al botón "Siguiente módulo ›" al final de un módulo — se ve mientras el usuario todavía no completó lo necesario para pasar al que sigue.'
            text={blockedNextText}
            enabled={blockedNextEnabled}
            onTextChange={setBlockedNextText}
            onEnabledChange={setBlockedNextEnabled}
          />
          <GuideMessageField
            id="pending-content"
            label="Contenido en revisión"
            hint="Aparece debajo de un contenido o un proceso puntual que el equipo de desarrollo marcó como “todavía en revisión” (por ejemplo, algo que depende de una herramienta que no funciona bien hoy) — no se activa desde este panel, solo se edita el texto que muestra cuando ya está marcado."
            text={pendingText}
            enabled={pendingEnabled}
            onTextChange={setPendingText}
            onEnabledChange={setPendingEnabled}
          >
            <PendingSummaryNote summary={pendingSummary} />
          </GuideMessageField>
        </div>
      </Card>

      {error && <p className="max-w-3xl text-sm text-danger">{error}</p>}
      <Button type="submit" isLoading={isSubmitting} className="self-start">
        Guardar cambios
      </Button>
    </form>
  );
}

function GuideMessageField({
  id,
  label,
  hint,
  text,
  enabled,
  onTextChange,
  onEnabledChange,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  text: string;
  enabled: boolean;
  onTextChange: (value: string) => void;
  onEnabledChange: (value: boolean) => void;
  /** Nota adicional (ej. a qué le aplica HOY, ver PendingSummaryNote) — debajo del hint, antes del textarea. */
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">{label}</p>
          <p className="text-xs text-ink-soft">{hint}</p>
          {children}
        </div>
        <Checkbox
          id={`${id}-enabled`}
          label="Mostrar"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
      </div>
      <Textarea
        id={id}
        rows={2}
        value={text}
        disabled={!enabled}
        onChange={(event) => onTextChange(event.target.value)}
        className={!enabled ? "opacity-50" : undefined}
      />
      {enabled && text && (
        <p className="mt-2 text-xs text-ink-soft">
          Vista previa: <span className="italic">{text}</span>
        </p>
      )}
    </div>
  );
}

/**
 * A qué le aplica el mensaje "Contenido en revisión" AHORA MISMO — sin
 * esto, el toggle de arriba es abstracto ("¿a qué le pasa esto?"), y hoy ni
 * siquiera hay forma de marcar/desmarcar algo como pendiente desde el
 * panel (es una lista fija en el código, ver src/lib/pending-content.ts):
 * mostrar la lista real es lo único que le da contexto concreto a la admin.
 */
function PendingSummaryNote({ summary }: { summary: PendingContentSummary }) {
  const titles = [...summary.contentItems, ...summary.processes];
  if (titles.length === 0) {
    return (
      <p className="mt-1 text-xs italic text-ink-soft">
        Hoy no hay ningún contenido ni proceso marcado como pendiente — este mensaje no se ve en ningún lado del recorrido
        todavía.
      </p>
    );
  }
  return (
    <p className="mt-1 text-xs text-ink-soft">
      Hoy se ve debajo de: {titles.map((title) => `"${title}"`).join(", ")}.
    </p>
  );
}
