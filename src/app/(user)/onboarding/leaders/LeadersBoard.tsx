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
}: {
  gerencia: LeaderCardData[];
  equipo: LeaderCardData[];
  equipoLabel: string | null;
}) {
  const [playing, setPlaying] = useState<LeaderCardData | null>(null);

  return (
    <div className="flex flex-col gap-12">
      {gerencia.length > 0 && <LeaderSection id="gerencia" title="Gerencia" leaders={gerencia} onPlay={setPlaying} />}
      {equipo.length > 0 && (
        <LeaderSection
          id="equipo"
          title={equipoLabel ? `Tu equipo · ${equipoLabel}` : "Tu equipo"}
          leaders={equipo}
          onPlay={setPlaying}
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
}: {
  id: string;
  title: string;
  leaders: LeaderCardData[];
  onPlay: (leader: LeaderCardData) => void;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="mb-4 font-display text-xl font-semibold text-ink">{title}</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {leaders.map((leader) => (
          <LeaderCard key={leader.id} leader={leader} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}
