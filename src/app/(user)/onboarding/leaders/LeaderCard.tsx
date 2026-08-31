import type { resolveVisibleLeadersWithMedia } from "@/server/services/leader.service";

export type LeaderCardData = Awaited<ReturnType<typeof resolveVisibleLeadersWithMedia>>[number];

/**
 * Tile compacta para la grilla de líderes (reemplaza la card full-width
 * anterior, una por fila). Si hay video se prioriza su miniatura real (frame
 * del video, vía getVideoThumbnailUrl) sobre la foto — así la card muestra
 * una vista previa real en vez de un cuadro plano con solo el ícono de play;
 * si no hay miniatura derivable (Vimeo/Loom) cae a la foto, y si tampoco hay
 * foto, a las iniciales. El botón de play cubre la miniatura y abre el modal
 * (LeadersBoard decide qué se abre) — el iframe del video nunca vive acá,
 * así una grilla de 13 líderes no carga 13 iframes de una.
 */
export function LeaderCard({ leader, onPlay }: { leader: LeaderCardData; onPlay: (leader: LeaderCardData) => void }) {
  const initials = leader.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const thumbnailSrc = leader.videoThumbnailUrl ?? leader.photoUrl;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-card shadow-md">
      {/* Las fotos que sube el equipo son cuadradas (300x300) — una caja
          cuadrada evita recortar innecesariamente arriba/abajo (lo que
          antes empujaba la cara fuera de foco con una caja 4:3). */}
      <div className="relative aspect-square w-full bg-brand-tint">
        {thumbnailSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- fuente arbitraria (Vercel Blob / Drive / YouTube), no un asset propio optimizable con next/image
          <img src={thumbnailSrc} alt={leader.name} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          // Sin foto ni miniatura: iniciales de fondo — pero si además hay
          // video, el botón de play ya ocupa el centro, así que se omiten
          // para no encimarse con él.
          !leader.videoUrl && (
            <span className="absolute inset-0 flex items-center justify-center font-display text-3xl font-semibold text-brand">
              {initials}
            </span>
          )
        )}

        {leader.videoUrl && (
          <button
            type="button"
            onClick={() => onPlay(leader)}
            aria-label={`Reproducir video de ${leader.name}`}
            className="group absolute inset-0 flex items-center justify-center bg-ink/0 transition-colors hover:bg-ink/30"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-brand-strong shadow-md transition-transform group-hover:scale-105">
              <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-0.5 p-4">
        <h3 className="font-display text-base font-semibold leading-snug text-ink">{leader.name}</h3>
        <p className="text-sm text-ink-soft">{leader.title}</p>
      </div>
    </div>
  );
}
