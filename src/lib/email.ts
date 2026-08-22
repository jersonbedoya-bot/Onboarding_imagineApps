/**
 * Único punto de normalización de email en todo el sistema.
 * Todo lo que lea o escriba un email (repositorios, seed, futuras
 * invitaciones) pasa por acá — nunca hacer trim/lowercase disperso.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
