import { describe, expect, it } from "vitest";
import { normalizeVideoUrl } from "@/lib/video-url";
import { ValidationError } from "@/server/errors";

describe("normalizeVideoUrl — allowlist de proveedores de video", () => {
  it("normaliza YouTube (watch?v=)", () => {
    const result = normalizeVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s");
    expect(result).toEqual({ provider: "YOUTUBE", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
  });

  it("normaliza YouTube (youtu.be)", () => {
    const result = normalizeVideoUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(result).toEqual({ provider: "YOUTUBE", embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
  });

  it("normaliza Vimeo", () => {
    const result = normalizeVideoUrl("https://vimeo.com/123456789");
    expect(result).toEqual({ provider: "VIMEO", embedUrl: "https://player.vimeo.com/video/123456789" });
  });

  it("normaliza Loom", () => {
    const result = normalizeVideoUrl("https://www.loom.com/share/abcdefabcdefabcdefabcdefabcdefab");
    expect(result).toEqual({
      provider: "LOOM",
      embedUrl: "https://www.loom.com/embed/abcdefabcdefabcdefabcdefabcdefab",
    });
  });

  it("normaliza Google Drive (/file/d/{id}/view)", () => {
    const result = normalizeVideoUrl("https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view?usp=sharing");
    expect(result).toEqual({
      provider: "GOOGLE_DRIVE",
      embedUrl: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/preview",
    });
  });

  it("normaliza Google Drive (/open?id=)", () => {
    const result = normalizeVideoUrl("https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345");
    expect(result).toEqual({
      provider: "GOOGLE_DRIVE",
      embedUrl: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/preview",
    });
  });

  it("rechaza un host fuera de la allowlist (riesgo XSS/embebido arbitrario)", () => {
    expect(() => normalizeVideoUrl("https://evil.example.com/video.mp4")).toThrow(ValidationError);
  });

  it("rechaza una URL que no es una URL válida", () => {
    expect(() => normalizeVideoUrl("no-es-una-url")).toThrow(ValidationError);
  });

  it("rechaza protocolo no https", () => {
    expect(() => normalizeVideoUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toThrow(ValidationError);
  });

  it("nunca devuelve la URL cruda pegada por el admin, siempre la reconstruida", () => {
    const malicious = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&malicious=<script>alert(1)</script>";
    const result = normalizeVideoUrl(malicious);
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(result.embedUrl).not.toContain("script");
  });
});
