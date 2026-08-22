import { randomBytes, createHash } from "node:crypto";

/**
 * Único punto de generación/hash de tokens de invitación. El token crudo
 * (256 bits de entropía) solo existe una vez, en la respuesta que arma el
 * link/mensaje copiable — nunca se persiste. En la base solo vive su hash.
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * SHA-256, no bcrypt: acá necesitamos lookup exacto por igualdad de hash
 * (findOne por tokenHash), no una verificación con salt como en passwords.
 * La seguridad viene de la entropía del token, no del costo del hash.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
