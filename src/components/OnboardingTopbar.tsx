"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ProgressBar } from "@/components/ProgressBar";
import { UserMenu } from "@/components/UserMenu";
import { Logo } from "@/components/Logo";
import type { resolveJourney } from "@/server/services/progress.service";

type JourneyStage = Awaited<ReturnType<typeof resolveJourney>>["stages"][number];

/**
 * Chrome de /onboarding/* — reemplaza al OnboardingSidebar lateral: hoy no
 * hace falta saltar directo a cualquier fase alcanzada desde un mapa fijo
 * (el avance ya es secuencial vía "Módulo anterior/siguiente" en
 * OnboardingJourney); si se necesita esa navegación directa más adelante,
 * se reintroduce. Esta barra da solo lo que no vive en ningún otro lado
 * (Equipo/logout) + progreso global, y libera todo el ancho de la
 * pantalla para el contenido en vez de compartirlo con un panel fijo.
 * Recursos ya no tiene link propio acá — sus políticas pasaron a ser
 * contenido real dentro de "Tu Día a Día en Imagine Apps" (ver MIGRATIONS.md).
 */
export function OnboardingTopbar({
  stages,
  currentStageId,
  finalQuizPending,
}: {
  stages: JourneyStage[];
  currentStageId: string | null;
  /**
   * true cuando ya no queda nada obligatorio (currentStageId === null) pero
   * el quiz del último módulo sigue sin responder — ver layout.tsx. Antes
   * esta barra decía "Recorrido completo" apenas se marcaba el último
   * proceso, ANTES del quiz final: el cierre real es pasar ese quiz.
   */
  finalQuizPending: boolean;
}) {
  const pathname = usePathname();
  // Antes sumaba +1 a totalPhases/completedPhases (una fase "fantasma" para
  // representar el cierre) — eso hacía que acá dijera "Fase 3 de 4" mientras
  // StageSection, con el total real de etapas, decía "Fase 3 de 3" (ver
  // feedback de usuario). Mismo total en los dos lados: stages.length.
  const totalPhases = stages.length;
  const lastIndex = stages.length - 1;
  // Con el quiz final pendiente, la persona sigue en el último módulo aunque
  // currentStageId ya sea null (nada obligatorio pendiente).
  const currentIndex = finalQuizPending ? lastIndex : stages.findIndex((stage) => stage.id === currentStageId);
  const allPhasesComplete = currentStageId === null && !finalQuizPending && stages.every((stage) => stage.status === "COMPLETE");
  // Un módulo solo de lectura (readOnly) figura COMPLETE desde el inicio;
  // se cuenta como hecho recién cuando la persona ya pasó de él — si no, el
  // primer día arrancaba en "1/3" sin haber hecho nada.
  // El último módulo tampoco cuenta como hecho mientras su quiz siga
  // pendiente: si no, la barra llegaba a 3/3 antes del cierre real.
  const completedPhases = stages.filter(
    (stage, i) =>
      stage.status === "COMPLETE" &&
      (!stage.readOnly || allPhasesComplete || i < currentIndex) &&
      !(finalQuizPending && i === lastIndex),
  ).length;
  const phaseLabel = allPhasesComplete
    ? "Recorrido completo"
    : `Módulo ${currentIndex >= 0 ? currentIndex + 1 : totalPhases} de ${totalPhases}`;

  const progressValue = (completedPhases / totalPhases) * 100;
  const progressLabel = `${completedPhases}/${totalPhases}`;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/60 backdrop-blur">
      {/* Debajo de sm: padding lateral de 16px (px-4), gap más chico y
          "Cerrar sesión" solo con ícono (ver UserMenu compactOnMobile) — con
          px-6 + gap-4 la fila medía 440px en un celular de 390 y el botón
          se cortaba ("Cerrar se…"). */}
      <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-12 xl:max-w-6xl xl:px-16 xl:py-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/onboarding">
            <Logo className="text-base xl:text-lg" />
          </Link>

          <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
            <div className="max-w-[220px] flex-1 xl:max-w-xs">
              <ProgressBar value={progressValue} label={progressLabel} />
            </div>
            <span className="whitespace-nowrap text-xs text-ink-soft xl:text-sm">{phaseLabel}</span>
          </div>

          <nav className="ml-auto flex min-w-0 items-center gap-1 xl:gap-2">
            <TopbarLink href="/onboarding/leaders" active={pathname === "/onboarding/leaders"}>
              Nuestro equipo
            </TopbarLink>
            <UserMenu compactOnMobile />
          </nav>
        </div>

        {/* Debajo de sm el progreso no entra en la misma fila que logo+nav sin
            amontonarse — antes se ocultaba del todo acá (ver auditoría), así
            que en mobile no había NINGUNA señal de avance global fija en
            pantalla. Segunda fila propia, mismo ProgressBar/label que arriba. */}
        <div className="mt-2 flex items-center gap-3 sm:hidden">
          <div className="min-w-0 flex-1">
            <ProgressBar value={progressValue} label={progressLabel} />
          </div>
          <span className="whitespace-nowrap text-xs text-ink-soft">{phaseLabel}</span>
        </div>
      </div>
    </header>
  );
}

function TopbarLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      // Texto blanco y activo naranja con línea debajo, como el menú de imagineapps.co.
      className={cn(
        "whitespace-nowrap border-b-2 px-2.5 py-1.5 text-xs font-semibold transition-colors xl:px-3 xl:py-2 xl:text-sm",
        active ? "border-brand-strong text-brand-strong" : "border-transparent text-ink hover:text-brand-strong",
      )}
    >
      {children}
    </Link>
  );
}
