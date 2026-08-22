import bcrypt from "bcryptjs";
import type { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { findByEmail } from "@/server/repositories/user.repository";

export type AuthenticatedIdentity = {
  userId: ObjectId;
  tenantId: ObjectId;
};

/**
 * Verifica credenciales y devuelve la identidad mínima (userId+tenantId)
 * o null si no son válidas. El motivo real del rechazo se loguea acá;
 * el caller (Credentials provider) nunca lo expone al cliente — el
 * mensaje que ve el usuario es siempre genérico ("credenciales
 * inválidas o cuenta no activa"), sin confirmar si el email existe.
 */
export async function authenticateUser(input: {
  email: string;
  password: string;
}): Promise<AuthenticatedIdentity | null> {
  const user = await findByEmail(input.email);

  if (!user) {
    logger.warn("login_rejected", { reason: "user_not_found" });
    return null;
  }

  if (user.status !== "ACTIVE") {
    logger.warn("login_rejected", { reason: "inactive_status", userId: user._id.toString(), status: user.status });
    return null;
  }

  if (!user.passwordHash) {
    logger.warn("login_rejected", { reason: "missing_password_hash", userId: user._id.toString() });
    return null;
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    logger.warn("login_rejected", { reason: "invalid_password", userId: user._id.toString() });
    return null;
  }

  return { userId: user._id, tenantId: user.tenantId };
}
