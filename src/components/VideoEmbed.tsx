import { cn } from "@/lib/cn";
import type { VideoProvider } from "@/types/enums";

/**
 * src puede ser SOLO un embed canónico ya normalizado por normalizeVideoUrl
 * (YouTube/Vimeo/Loom/Google Drive) — nunca una URL cruda. Ver src/lib/video-url.ts.
 */
export function VideoEmbed({ src, title, provider }: { src: string; title: string; provider?: VideoProvider | null }) {
  // El preview de Google Drive trae su propia barra superior (nombre del
  // archivo) fija dentro del iframe — con el aspect-video puro (16:9), en
  // una pantalla angosta esa barra se come una porción grande de una caja
  // ya muy baja y el video queda ilegible sin pasar a pantalla completa.
  // Un min-height le da aire a esa barra sin afectar YouTube/Vimeo/Loom
  // (que sí escalan bien en 16:9 puro) ni la relación 16:9 en pantallas
  // más anchas, donde aspect-video ya supera ese mínimo.
  const isGoogleDrive = provider === "GOOGLE_DRIVE";

  return (
    <div
      className={cn(
        "aspect-video w-full overflow-hidden rounded-md border border-line bg-ink/5",
        isGoogleDrive && "min-h-[280px]",
      )}
    >
      <iframe
        src={src}
        title={title}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
