/**
 * src puede ser SOLO un embed canónico ya normalizado por normalizeVideoUrl
 * (YouTube/Vimeo/Loom/Google Drive) — nunca una URL cruda. Ver src/lib/video-url.ts.
 */
export function VideoEmbed({ src, title }: { src: string; title: string }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-md border border-line bg-ink/5">
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
