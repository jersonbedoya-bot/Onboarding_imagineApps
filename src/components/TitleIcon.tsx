import { splitLeadingEmoji } from "@/lib/split-emoji";

/**
 * Título con emoji líder a tamaño fijo (ver split-emoji.ts) — el resto del
 * texto conserva el tamaño/peso que ya trae el elemento padre (h2, p, etc.);
 * este componente solo desacopla el ícono de ese font-size. `aria-hidden` en
 * el emoji: el texto ya comunica el contenido, no hace falta que un lector
 * de pantalla intente pronunciar el glifo.
 */
export function TitleIcon({ title, size = "text-3xl" }: { title: string; size?: string }) {
  const { icon, text } = splitLeadingEmoji(title);
  if (!icon) return <>{title}</>;
  return (
    <>
      <span aria-hidden="true" className={`${size} mr-1 inline-block align-[-0.15em] leading-none`}>
        {icon}
      </span>
      {text}
    </>
  );
}
