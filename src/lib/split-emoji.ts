/**
 * Separa el emoji líder de un título guardado en Mongo (etapas, contenidos
 * y procesos siguen el patrón "<emoji> Texto") del resto del texto — para
 * poder darle al ícono un tamaño fijo, independiente del font-size del
 * título que lo contiene. Sin esto, el mismo emoji se ve gigante dentro de
 * un <h2> grande (ver TitleIcon.tsx) y chico dentro de una card — no es que
 * los glifos sean distintos entre sí, es que heredan el font-size de donde
 * caen.
 */
const LEADING_EMOJI = /^(\p{Extended_Pictographic}(?:\u{FE0F}|\u{200D}\p{Extended_Pictographic})*)\s*/u;

export function splitLeadingEmoji(title: string): { icon: string | null; text: string } {
  const match = LEADING_EMOJI.exec(title);
  if (!match) return { icon: null, text: title };
  return { icon: match[1], text: title.slice(match[0].length).trimStart() };
}
