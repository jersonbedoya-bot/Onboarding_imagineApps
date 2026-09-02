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
      <h2 className="mb-4 font-display text-xl font-semibold text-ink xl:text-2xl">{title}</h2>
      {/* auto-fit + minmax en vez de columnas fijas por breakpoint: con un
          número de columnas fijo (ej. xl:grid-cols-4), una cantidad de
          líderes que no es múltiplo exacto (típico en "Gerencia", un grupo
          chico y fijo) deja la última fila con un hueco grande y descuadrado
          — más visible cuanto más ancho es el contenedor. Acotando el ancho
          de cada card (220-260px) y centrando el bloque, la grilla arma
          tantas columnas como entran y la fila incompleta queda centrada en
          vez de pegada a la izquierda con espacio vacío a la derecha. */}
      <div className="grid grid-cols-1 gap-5 sm:[grid-template-columns:repeat(auto-fit,minmax(220px,260px))] sm:justify-center">
        {leaders.map((leader) => (
          <LeaderCard key={leader.id} leader={leader} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}
