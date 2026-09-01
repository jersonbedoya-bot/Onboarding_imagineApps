"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ProgressBar } from "@/components/ProgressBar";
import { UserMenu } from "@/components/UserMenu";
import type { resolveJourney } from "@/server/services/progress.service";

type JourneyStage = Awaited<ReturnType<typeof resolveJourney>>["stages"][number];

/**
 * Mapa principal del recorrido (Bloque 2) — reemplaza <OnboardingTopbar/>
 * + <StageStepper/>. No deriva desbloqueo/progreso propio: usa tal cual
 * `unlocked`/`status`/`completedCount` que ya calcula resolveJourney vía
 * progress-derivation.ts.
 *
 * "Cierre y Seguimiento" no es un stage en Mongo (la fase aprobada
 * reutiliza la pantalla de finalización existente, sin quiz nuevo) — acá
 * se sintetiza a partir de `stages` + `currentStageId`: completa en
 * cuanto las 4 fases reales lo están, nunca antes.
 *
 * Recursos vive fuera de este stepper por completo — es un link fijo,
 * siempre habilitado, que no lee `stages` para nada.
 */
export function OnboardingSidebar({ stages, currentStageId }: { stages: JourneyStage[]; currentStageId: string | null }) {
  const pathname = usePathname();
  const allPhasesComplete = stages.every((stage) => stage.status === "COMPLETE");
  const completedPhases = stages.filter((stage) => stage.status === "COMPLETE").length + (allPhasesComplete ? 1 : 0);
  const totalPhases = stages.length + 1;
  const currentStage = stages.find((stage) => stage.id === currentStageId);
  const currentPhaseSummary = currentStage
    ? `${String(stages.indexOf(currentStage) + 1).padStart(2, "0")} · ${displayTitle(currentStage.title)}`
    : "05 · Cierre y Seguimiento";

  const content = (
    <div className="flex h-full min-w-0 flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-base font-bold text-ink">
          imagine<span className="text-brand">.</span>
        </span>
        <Link
          href="/onboarding/leaders"
          className={cn(
            "whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
            pathname === "/onboarding/leaders" ? "bg-brand-tint text-brand-strong" : "text-ink-soft hover:bg-brand-tint hover:text-brand-strong",
          )}
        >
          Nuestro equipo
        </Link>
      </div>

      <div>
        <ProgressBar value={(completedPhases / totalPhases) * 100} label={`${completedPhases}/${totalPhases}`} />
        <p className="mt-1.5 text-xs text-ink-soft">
          {allPhasesComplete ? "Recorrido completo" : `Fase ${stages.filter((s) => s.status === "COMPLETE").length + 1} de ${totalPhases}`}
        </p>
      </div>

      <nav aria-label="Recorrido del onboarding" className="flex flex-col gap-4">
        <span className="text-xs font-bold uppercase tracking-widest text-ink-soft/60">Recorrido</span>
        <ol className="flex flex-col gap-1">
          {stages.map((stage, index) => (
            <PhaseRow
              key={stage.id}
              index={index + 1}
              title={displayTitle(stage.title)}
              href={`/onboarding?stage=${stage.id}`}
              state={stage.status === "COMPLETE" ? "complete" : stage.unlocked ? (stage.id === currentStageId ? "current" : "available") : "locked"}
              progress={
                !stage.readOnly && stage.id === currentStageId && stage.totalCompletable > 0
                  ? `${stage.completedCount}/${stage.totalCompletable}`
                  : null
              }
              active={pathname === "/onboarding" && stage.id === currentStageId}
            />
          ))}
          <PhaseRow
            index={stages.length + 1}
            title="Cierre y Seguimiento"
            href="/onboarding"
            state={allPhasesComplete ? "complete" : "locked"}
            progress={null}
            active={pathname === "/onboarding" && currentStageId === null}
          />
        </ol>
      </nav>

      <div className="border-t border-line pt-4">
        <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-ink-soft/60">Recursos</span>
        <Link
          href="/onboarding/resources"
          className={cn(
            "flex items-center gap-2.5 rounded-md border border-dashed px-3 py-2 text-sm font-semibold transition-colors",
            pathname === "/onboarding/resources"
              ? "border-brand bg-brand-tint text-brand-strong"
              : "border-line text-ink-soft hover:border-brand-soft hover:text-ink",
          )}
        >
          <span aria-hidden="true">📚</span> Recursos
        </Link>
        <p className="mt-1.5 text-[11px] leading-snug text-ink-soft">Consulta libre — no forma parte del recorrido obligatorio.</p>
      </div>

      <div className="mt-auto border-t border-line pt-4">
        <UserMenu />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile / tablet: mismo contenido, colapsado detrás de un <details> nativo
          (sin JS propio). La barra cerrada muestra la fase actual en vez de repetir
          la marca — "imagine." ya vive adentro, en el header de `content`. */}
      <details className="border-b border-line bg-card px-5 py-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
          <span className="min-w-0 truncate text-sm font-semibold text-ink">{currentPhaseSummary}</span>
          <span className="flex-shrink-0 text-xs font-semibold text-brand-strong">Ver recorrido ▾</span>
        </summary>
        <div className="pt-4">{content}</div>
      </details>

      {/* Desktop: sidebar fijo, siempre visible. */}
      <aside className="hidden border-r border-line bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-shrink-0 lg:overflow-y-auto lg:px-6 lg:py-8">
        {content}
      </aside>
    </>
  );
}

type PhaseState = "complete" | "current" | "available" | "locked";

function PhaseRow({
  index,
  title,
  href,
  state,
  progress,
  active,
}: {
  index: number;
  title: string;
  href: string;
  state: PhaseState;
  progress: string | null;
  active: boolean;
}) {
  const num = String(index).padStart(2, "0");
  const locked = state === "locked";

  const inner = (
    <>
      <span
        className={cn(
          "grid h-7 w-7 flex-shrink-0 place-items-center rounded-full border-2 font-mono text-[11px] font-bold tabular-nums",
          state === "complete" && "border-success bg-success text-white",
          state === "current" && "border-brand bg-brand text-white",
          state === "available" && "border-brand-soft text-brand-strong",
          state === "locked" && "border-line text-ink-soft/60",
        )}
      >
        {state === "complete" ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : locked ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth={2} />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth={2} />
          </svg>
        ) : (
          num
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-sm", state === "current" ? "font-semibold text-ink" : locked ? "text-ink-soft/60" : "text-ink")}>
          {num} · {title}
        </span>
        {progress && <span className="font-mono text-[11px] text-ink-soft">{progress}</span>}
      </span>
    </>
  );

  const rowClasses = cn(
    "flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
    active && "bg-brand-tint",
    !locked && !active && "hover:bg-brand-tint/50",
  );

  if (locked) {
    return (
      <li>
        <span className={cn(rowClasses, "cursor-not-allowed")} aria-disabled="true">
          {inner}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link href={href} className={rowClasses} aria-current={active ? "step" : undefined}>
        {inner}
      </Link>
    </li>
  );
}

/**
 * Los títulos de fase en Mongo llevan un emoji decorativo ("🚀 Fase 01 ·
 * Bienvenida y Cultura") y el propio número de fase — acá la fila ya
 * dibuja su propio ícono de estado y su propio "01 ·", así que ambos se
 * recortan para no duplicarlos.
 */
function displayTitle(title: string): string {
  return title
    .replace(/^\p{Extended_Pictographic}\s*/u, "")
    .replace(/^Fase\s*\d+\s*·\s*/i, "")
    .trim();
}
