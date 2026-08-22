import { ValidationError } from "@/server/errors";
import type { VideoProvider } from "@/types/enums";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);
const LOOM_HOSTS = new Set(["loom.com", "www.loom.com"]);

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{6,20}$/;
const VIMEO_ID_PATTERN = /^[0-9]{4,15}$/;
const LOOM_ID_PATTERN = /^[a-zA-Z0-9]{16,40}$/;

function extractYoutubeId(url: URL): string | null {
  if (url.hostname.toLowerCase() === "youtu.be") {
    return url.pathname.slice(1).split("/")[0] || null;
  }
  const fromQuery = url.searchParams.get("v");
  if (fromQuery) return fromQuery;

  const segments = url.pathname.split("/").filter(Boolean);
  const embedIndex = segments.findIndex((s) => s === "embed" || s === "shorts");
  if (embedIndex !== -1 && segments[embedIndex + 1]) return segments[embedIndex + 1];

  return null;
}

function extractVimeoId(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (url.hostname.toLowerCase() === "player.vimeo.com") {
    const videoIndex = segments.findIndex((s) => s === "video");
    return videoIndex !== -1 ? (segments[videoIndex + 1] ?? null) : null;
  }
  return segments[0] ?? null;
}

function extractLoomId(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  const anchorIndex = segments.findIndex((s) => s === "share" || s === "embed");
  return anchorIndex !== -1 ? (segments[anchorIndex + 1] ?? null) : null;
}

/**
 * Único punto de validación/normalización de URLs de video (content_items,
 * leaders, process_steps). Allowlist estricta de hosts — nunca se guarda
 * ni se renderiza en un <iframe> una URL fuera de YouTube/Vimeo/Loom
 * (riesgo XSS/embebido arbitrario). Devuelve siempre la URL de embed
 * CANÓNICA reconstruida a partir del id extraído, nunca la URL cruda que
 * pegó el admin.
 */
export function normalizeVideoUrl(rawUrl: string): { provider: VideoProvider; embedUrl: string } {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new ValidationError("La URL de video no es válida.");
  }

  if (url.protocol !== "https:") {
    throw new ValidationError("La URL de video debe usar https.");
  }

  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    const id = extractYoutubeId(url);
    if (!id || !YOUTUBE_ID_PATTERN.test(id)) {
      throw new ValidationError("No se pudo extraer un id de video de YouTube válido de esa URL.");
    }
    return { provider: "YOUTUBE", embedUrl: `https://www.youtube.com/embed/${id}` };
  }

  if (VIMEO_HOSTS.has(host)) {
    const id = extractVimeoId(url);
    if (!id || !VIMEO_ID_PATTERN.test(id)) {
      throw new ValidationError("No se pudo extraer un id de video de Vimeo válido de esa URL.");
    }
    return { provider: "VIMEO", embedUrl: `https://player.vimeo.com/video/${id}` };
  }

  if (LOOM_HOSTS.has(host)) {
    const id = extractLoomId(url);
    if (!id || !LOOM_ID_PATTERN.test(id)) {
      throw new ValidationError("No se pudo extraer un id de video de Loom válido de esa URL.");
    }
    return { provider: "LOOM", embedUrl: `https://www.loom.com/embed/${id}` };
  }

  throw new ValidationError("Proveedor de video no permitido. Solo YouTube, Vimeo o Loom.");
}
