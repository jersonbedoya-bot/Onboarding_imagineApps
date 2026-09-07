import type { ZodError } from "zod";

/**
 * Primer mensaje de campo de un ZodError — pensado para reemplazar el
 * mensaje genérico ("Datos inválidos.") que hasta ahora era lo único que
 * el cliente mostraba (ver toErrorResponse: expone `error.message`, pero
 * ningún form del admin lee `details.fieldErrors`, donde vivía el motivo
 * real). Sin esto, un rechazo de validación no decía CUÁL campo ni QUÉ
 * estaba mal — el usuario tenía que adivinar (pedido explícito del
 * usuario: probó agregar mayúscula + carácter especial a una contraseña
 * porque el error no explicaba que el problema real era la falta de un
 * número, ver resetPasswordSchema).
 *
 * `error.issues[0]` (no un fieldError agrupado por campo): en un form de
 * un solo campo — que es el caso de todos los `safeParse` de `/api/**`
 * hoy — el primer issue YA es el mensaje más específico posible; agrupar
 * por campo solo agrega complejidad para el caso (hoy inexistente) de un
 * form con varios campos inválidos a la vez.
 */
export function zodErrorMessage(error: ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}
