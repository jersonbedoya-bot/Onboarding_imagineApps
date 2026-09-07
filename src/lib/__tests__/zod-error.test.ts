import { describe, expect, it } from "vitest";
import { zodErrorMessage } from "@/lib/zod-error";
import { resetPasswordSchema } from "@/server/validation/user.schema";

/**
 * zodErrorMessage reemplaza el mensaje genérico ("Contraseña inválida.")
 * por el motivo real del rechazo — pedido explícito del usuario, que probó
 * a ciegas (agregó mayúscula + carácter especial) porque el error no decía
 * qué faltaba en verdad (un número). Se prueba contra resetPasswordSchema
 * real (no un schema de juguete) para cubrir exactamente ese caso.
 */
describe("zodErrorMessage", () => {
  it("devuelve el motivo específico (contraseña sin número)", () => {
    const parsed = resetPasswordSchema.safeParse({ password: "SoloLetrasMayúsYMinús" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(zodErrorMessage(parsed.error, "Contraseña inválida.")).toBe("Debe contener al menos un número.");
  });

  it("devuelve el motivo específico (contraseña sin letra)", () => {
    const parsed = resetPasswordSchema.safeParse({ password: "12345678" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(zodErrorMessage(parsed.error, "Contraseña inválida.")).toBe("Debe contener al menos una letra.");
  });

  it("con varios problemas a la vez, prioriza el primero definido en el schema (longitud antes que letra/número)", () => {
    const parsed = resetPasswordSchema.safeParse({ password: "abc" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(zodErrorMessage(parsed.error, "Contraseña inválida.")).toBe("La contraseña debe tener al menos 8 caracteres.");
  });

  it("una contraseña válida no genera ningún mensaje que probar (fallback nunca se ejercita en este caso)", () => {
    const parsed = resetPasswordSchema.safeParse({ password: "abcd1234" });
    expect(parsed.success).toBe(true);
  });
});
