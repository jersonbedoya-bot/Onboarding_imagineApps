"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { VideoEmbed } from "@/components/VideoEmbed";
import { LeaderCard, type LeaderCardData } from "./LeaderCard";

/**
 * Antes todos los líderes (gerencia + el equipo del rol del usuario) se
 * mostraban mezclados en una sola lista vertical. Acá se separan en dos
 * secciones — el usuario no tiene que adivinar quién es de gerencia y
 * quién es su equipo directo — y las cards pasan de "una por fila" a una
 * grilla, con el video detrás de un modal (ver LeaderCard).
 */
export function LeadersBoard({
  gerencia,
  equipo,
  equipoLabel,
  variant = "page",
}: {
  gerencia: LeaderCardData[];
  equipo: LeaderCardData[];
  equipoLabel: string | null;
  // "page": título de sección plano, para /onboarding/leaders (una página
  // propia, con su propio <h1> arriba — ver page.tsx). "card": cuando este
  // board se embebe DENTRO de una Card del recorrido (ver OnboardingJourney,
  // justo después de "Hitos que nos Definieron") — ahí el título debe leerse
  // como el de cualquier otra card del recorrido (mismo tamaño/peso + emoji
  // líder), no como un heading de página aparte.
  variant?: "page" | "card";
}) {
  const [playing, setPlaying] = useState<LeaderCardData | null>(null);

  return (
    <div className="flex flex-col gap-12">
      {gerencia.length > 0 && (
        <LeaderSection
          id="gerencia"
          title={variant === "card" ? "👑 Gerencia" : "Gerencia"}
          leaders={gerencia}
          onPlay={setPlaying}
          variant={variant}
        />
      )}
      {equipo.length > 0 && (
        <LeaderSection
          id="equipo"
          title={equipoLabel ? `Tu equipo · ${equipoLabel}` : "Tu equipo"}
          leaders={equipo}
          onPlay={setPlaying}
          variant={variant}
        />
      )}

      <Modal open={playing !== null} onClose={() => setPlaying(null)} title={playing?.name} maxWidthClassName="max-w-2xl">
        {playing && (
          <>
            <p className="mb-3 text-sm text-ink-soft">{playing.title}</p>
            <VideoEmbed src={playing.videoUrl!} title={playing.name} provider={playing.videoProvider} />
            {playing.description && <p className="mt-3 text-sm text-ink-soft">{playing.description}</p>}
          </>
        )}
      </Modal>
    </div>
  );
}

function LeaderSection({
  id,
  title,
  leaders,
  onPlay,
  variant = "page",
}: {
  id: string;
  title: string;
  leaders: LeaderCardData[];
  onPlay: (leader: LeaderCardData) => void;
  variant?: "page" | "card";
}) {
  return (
    <section id={id} className="scroll-mt-8">
      {/* Mismas clases que el título de una card de contenido del recorrido
          (ver item.title en OnboardingJourney) cuando variant="card" —
          leading-snug incluido — para que no se sienta "aparte" del resto. */}
      {variant === "card" ? (
        <p className="mb-4 font-display text-xl font-semibold leading-snug text-ink xl:text-2xl">{title}</p>
      ) : (
        <h2 className="mb-4 font-display text-xl font-semibold text-ink xl:text-2xl">{title}</h2>
      )}
      {/* Flexbox con wrap en vez de CSS Grid + auto-fit: con Grid,
          `justify-content: center` centra el bloque de columnas completo
          (compartido por TODAS las filas) — al ensanchar el contenedor,
          auto-fit arma tantas columnas que casi no queda espacio sobrante
          para centrar, y una fila incompleta (típico en "Gerencia", un
          grupo chico y fijo) queda pegada a la izquierda. Flexbox centra
          cada fila envuelta de forma independiente, sin importar cuánto se
          ensanche el contenedor (ver feedback de usuario) — el ancho por
          card (220-260px) vive en LeaderCard. */}
      <div className="flex flex-wrap justify-center gap-5">
        {leaders.map((leader) => (
          <LeaderCard key={leader.id} leader={leader} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}
