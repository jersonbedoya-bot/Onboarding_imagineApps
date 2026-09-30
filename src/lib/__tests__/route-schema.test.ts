import { describe, expect, it } from "vitest";
import { zodErrorMessage } from "@/lib/zod-error";
import { updateRouteContentSchema } from "@/server/validation/route.schema";

describe("updateRouteContentSchema", () => {
  it("un aviso desactivado se puede guardar con el texto vacío", () => {
    const parsed = updateRouteContentSchema.safeParse({ blockedNextMessage: "", blockedNextMessageEnabled: false });
    expect(parsed.success).toBe(true);
  });

  it("un aviso activado con texto vacío se rechaza con un motivo claro", () => {
    const parsed = updateRouteContentSchema.safeParse({ blockedNextMessage: " ", blockedNextMessageEnabled: true });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(zodErrorMessage(parsed.error, "fallback")).toContain("El aviso para avanzar necesita un texto");
  });

  it("aplica la misma regla al aviso de contenido en revisión", () => {
    expect(updateRouteContentSchema.safeParse({ pendingContentMessage: "", pendingContentMessageEnabled: false }).success).toBe(true);
    expect(updateRouteContentSchema.safeParse({ pendingContentMessage: "", pendingContentMessageEnabled: true }).success).toBe(false);
  });

  it("el título de bienvenida sigue siendo obligatorio", () => {
    expect(updateRouteContentSchema.safeParse({ headline: "A" }).success).toBe(false);
  });
});
