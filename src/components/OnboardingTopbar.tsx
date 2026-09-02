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
export function OnboardingTopbar({ stages, currentStageId }: { stages: JourneyStage[]; currentStageId: string | null }) {
  const pathname = usePathname();
  const allPhasesComplete = stages.every((stage) => stage.status === "COMPLETE");
  const completedPhases = stages.filter((stage) => stage.status === "COMPLETE").length + (allPhasesComplete ? 1 : 0);
  const totalPhases = stages.length + 1;
  const currentIndex = stages.findIndex((stage) => stage.id === currentStageId);
  const phaseLabel = allPhasesComplete
    ? "Recorrido completo"
    : `Fase ${currentIndex >= 0 ? currentIndex + 1 : totalPhases} de ${totalPhases}`;

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 lg:px-12 xl:max-w-6xl xl:px-16 xl:py-4">
        <Link href="/onboarding">
          <Logo className="text-base xl:text-lg" />
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-3 sm:flex">
          <div className="max-w-[220px] flex-1 xl:max-w-xs">
            <ProgressBar value={(completedPhases / totalPhases) * 100} label={`${completedPhases}/${totalPhases}`} />
          </div>
          <span className="whitespace-nowrap text-xs text-ink-soft xl:text-sm">{phaseLabel}</span>
        </div>

        <nav className="ml-auto flex items-center gap-1 xl:gap-2">
          <TopbarLink href="/onboarding/leaders" active={pathname === "/onboarding/leaders"}>
            Nuestro equipo
          </TopbarLink>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}

function TopbarLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors xl:px-3 xl:py-2 xl:text-sm",
        active ? "bg-brand-tint text-brand-strong" : "text-ink-soft hover:bg-brand-tint hover:text-brand-strong",
      )}
    >
      {children}
    </Link>
  );
}
