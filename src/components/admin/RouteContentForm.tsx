"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import { Input, Textarea, Checkbox } from "@/components/Field";
import { PendingBadge } from "@/components/PendingBadge";
import {
  DEFAULT_BLOCKED_NEXT_MESSAGE,
  DEFAULT_PENDING_CONTENT_MESSAGE,
  BLOCKED_NEXT_MESSAGE_MAX,
  PENDING_CONTENT_MESSAGE_MAX,
} from "@/lib/guide-message-defaults";

export type GuideMessageValue = { text: string; enabled: boolean };

export type PendingContentSummary = { contentItems: string[]; processes: string[]; steps: string[] };

/**
 * Editor de los textos que acompañan el recorrido (route.service.getRouteContent):
 * la bienvenida (título/subtítulo) y los 2 avisos automáticos.
 *
 * Cada bloque sigue el mismo orden, pensado para alguien sin trasfondo
 * técnico: qué es → cuándo lo ve la persona → el texto → una muestra de
 * cómo se ve. La muestra es necesaria, no decorativa: en /admin/preview
 * todos los módulos aparecen desbloqueados, así que el aviso para avanzar
 * nunca se ve ahí — esta es la única forma de verlo antes de guardar.
 *
 * Las reglas de "cuándo aparece" están verificadas contra el código real
 * (onboarding/page.tsx para la bienvenida, el pie de módulo en
 * OnboardingJourney.tsx para el aviso, pending-content.ts para contenido en
 * revisión). Si alguna de esas reglas cambia, este texto tiene que cambiar
 * con ella.
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
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
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
      setError(body?.error?.message ?? "No se pudieron guardar los cambios.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const pendingTitles = [...pendingSummary.contentItems, ...pendingSummary.processes];

  return (
    <form onSubmit={handleSubmit} className="flex max-w-3xl flex-col gap-6">
      {/* ───── 1. Bienvenida ───── */}
      <Card>
        <BlockHeader
          number={1}
          title="Bienvenida del recorrido"
          what="El título grande con el que cada persona empieza su onboarding."
          when="Arriba de todo, en cada visita, hasta que la persona completa su primer módulo. Después deja de verse. Si ese primer módulo no tiene nada obligatorio, no llega a verse."
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <Input id="route-headline" label="Título" required value={headlineValue} onChange={(event) => setHeadlineValue(event.target.value)} />
            <Textarea
              id="route-subtitle"
              label="Subtítulo (opcional)"
              rows={2}
              value={subtitleValue}
              onChange={(event) => setSubtitleValue(event.target.value)}
            />
          </div>
          <Sample>
            {/* Mismas clases que RouteHeader, a escala reducida. */}
            <div className="rounded-2xl border border-brand-soft bg-gradient-to-br from-brand-tint to-card px-5 py-6">
              <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-strong">
                Tu recorrido
              </span>
              <p className="text-gradient-brand font-display text-2xl font-semibold leading-tight">{headlineValue || "…"}</p>
              {subtitleValue && <p className="mt-2 text-sm text-ink-soft">{subtitleValue}</p>}
            </div>
          </Sample>
        </div>
      </Card>

      {/* ───── 2. Aviso para avanzar ───── */}
      <Card>
        <BlockHeader
          number={2}
          title="Aviso para avanzar"
          what="Le explica a la persona por qué todavía no puede pasar al siguiente módulo."
          when="Al final de un módulo, en lugar del botón «Siguiente módulo ›» (o «🎉 Terminar Onboarding» en el último), mientras la persona no termine lo obligatorio de ese módulo: los contenidos marcados como obligatorios y los pasos de sus procesos."
          extra="Solo frena a la persona si el siguiente módulo depende de este y este es obligatorio (en Módulos → Editar: «Depende de» y «Obligatorio completarlo para abrir los módulos que dependen de este»). Si no, el botón aparece siempre y este aviso no se ve."
        />
        <MessageEditor
          id="blocked-next"
          toggleLabel="Mostrar este aviso"
          text={blockedNextText}
          enabled={blockedNextEnabled}
          maxLength={BLOCKED_NEXT_MESSAGE_MAX}
          defaultText={DEFAULT_BLOCKED_NEXT_MESSAGE}
          onTextChange={setBlockedNextText}
          onEnabledChange={setBlockedNextEnabled}
          offWarning="Si lo desactivas, ese espacio queda vacío: la persona no ve el botón ni una explicación de por qué no puede avanzar."
        />
        <div className="mt-4">
          <Sample note="En la vista previa del panel no aparece, porque ahí todos los módulos están desbloqueados. Así lo verá la persona:">
            {/* Mismo pie de módulo que OnboardingJourney: línea arriba, anterior a la izquierda. */}
            <div className="flex items-center justify-between gap-3 border-t border-line bg-card px-2 pt-4">
              <span className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink">‹ Módulo anterior</span>
              {blockedNextEnabled && blockedNextText.trim() ? (
                <p className="text-xs text-ink-soft">{blockedNextText}</p>
              ) : (
                <span className="rounded border border-dashed border-line px-3 py-1.5 text-xs italic text-ink-soft/70">Espacio vacío</span>
              )}
            </div>
          </Sample>
        </div>
      </Card>

      {/* ───── 3. Contenido en revisión ───── */}
      <Card>
        <BlockHeader
          number={3}
          title="Aviso de contenido en revisión"
          what="Avisa que un contenido o proceso puntual todavía no tiene su versión definitiva (por ejemplo, porque depende de una herramienta que hoy no funciona bien)."
          when="Dentro de la tarjeta de cada contenido o proceso que el equipo técnico marcó como «en revisión», junto a la etiqueta «⚠️ Pendiente de actualización»."
          extra="Qué queda marcado no se elige desde el panel: aquí solo cambias el texto o lo ocultas. Si necesitas marcar o desmarcar algo, pídeselo al equipo técnico."
          badge="Lo marca el equipo técnico"
        />
        <div className="mb-4 rounded-md bg-paper px-3 py-2 text-xs text-ink-soft">
          {pendingTitles.length === 0 ? (
            <p>
              <strong className="text-ink">Hoy no se ve en ninguna parte:</strong> no hay ningún contenido ni proceso marcado como en
              revisión.
            </p>
          ) : (
            <p>
              <strong className="text-ink">Hoy aparece debajo de:</strong> {pendingTitles.map((title) => `«${title}»`).join(", ")}.
            </p>
          )}
          {pendingSummary.steps.length > 0 && (
            <p className="mt-1.5">
              Aparte, {pendingSummary.steps.length === 1 ? "este paso muestra" : "estos pasos muestran"} la etiqueta fija «⚠️ Pendiente de
              actualización», que no depende de este aviso: {pendingSummary.steps.map((title) => `«${title}»`).join(", ")}.
            </p>
          )}
        </div>
        <MessageEditor
          id="pending-content"
          toggleLabel="Mostrar este aviso"
          text={pendingText}
          enabled={pendingEnabled}
          maxLength={PENDING_CONTENT_MESSAGE_MAX}
          defaultText={DEFAULT_PENDING_CONTENT_MESSAGE}
          onTextChange={setPendingText}
          onEnabledChange={setPendingEnabled}
          offWarning="Si lo desactivas, el contenido marcado sigue mostrando la etiqueta «⚠️ Pendiente de actualización», pero sin esta explicación."
        />
        <div className="mt-4">
          <Sample>
            <div className="flex flex-col gap-1.5 rounded-md border border-line bg-card px-4 py-3">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-display text-base font-semibold text-ink">Título del contenido</span>
                <PendingBadge />
              </span>
              <span className="text-xs text-ink-soft/70">…el contenido se sigue viendo normal…</span>
              {pendingEnabled && pendingText.trim() && <p className="text-xs text-ink-soft">{pendingText}</p>}
            </div>
          </Sample>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Guardar cambios
        </Button>
        {saved && !error && <span className="text-sm text-ink-soft">✓ Cambios guardados</span>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

function BlockHeader({
  number,
  title,
  what,
  when,
  extra,
  badge,
}: {
  number: number;
  title: string;
  what: string;
  when: string;
  /** Aclaración secundaria (excepciones, quién lo controla) — debajo de "Cuándo aparece". */
  extra?: string;
  badge?: string;
}) {
  return (
    <div className="mb-5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-tint text-xs font-bold text-brand-strong">{number}</span>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {badge && <Badge variant="neutral">{badge}</Badge>}
      </div>
      <p className="text-sm text-ink-soft">{what}</p>
      <p className="mt-2 text-sm text-ink-soft">
        <strong className="text-ink">Cuándo aparece:</strong> {when}
      </p>
      {extra && <p className="mt-1.5 text-xs text-ink-soft">{extra}</p>}
    </div>
  );
}

function MessageEditor({
  id,
  toggleLabel,
  text,
  enabled,
  maxLength,
  defaultText,
  onTextChange,
  onEnabledChange,
  offWarning,
}: {
  id: string;
  toggleLabel: string;
  text: string;
  enabled: boolean;
  maxLength: number;
  defaultText: string;
  onTextChange: (value: string) => void;
  onEnabledChange: (value: boolean) => void;
  offWarning: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Checkbox id={`${id}-enabled`} label={toggleLabel} checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
      <Textarea
        id={id}
        aria-label="Texto del aviso"
        rows={2}
        maxLength={maxLength}
        value={text}
        disabled={!enabled}
        onChange={(event) => onTextChange(event.target.value)}
        className={!enabled ? "opacity-50" : undefined}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        {enabled && text !== defaultText ? (
          <button type="button" onClick={() => onTextChange(defaultText)} className="font-semibold text-brand-strong hover:underline">
            Restaurar texto original
          </button>
        ) : (
          <span />
        )}
        <span>
          {text.length}/{maxLength}
        </span>
      </div>
      {!enabled && <p className="text-xs font-semibold text-danger">⚠ {offWarning}</p>}
    </div>
  );
}

function Sample({ note, children }: { note?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft/70">Así se ve</span>
      {note && <p className="text-xs text-ink-soft">{note}</p>}
      {children}
    </div>
  );
}
