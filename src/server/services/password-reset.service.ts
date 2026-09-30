import bcrypt from "bcryptjs";
import type { ObjectId } from "mongodb";
import { NotFoundError, ValidationError } from "@/server/errors";
import type { RequestIdentity } from "@/server/auth/session";
import { env } from "@/server/config/env";
import { generateToken, hashToken } from "@/lib/token";
import { logger } from "@/lib/logger";
import * as userRepository from "@/server/repositories/user.repository";
import * as passwordResetRepository from "@/server/repositories/password-reset.repository";
import * as auditRepository from "@/server/repositories/audit.repository";

/**
 * "Olvidé mi contraseña" sin envío de correos. La plataforma no manda
 * emails (ver BACKLOG.md), así que el flujo tiene un paso humano:
 *
 *   1. La persona pide ayuda en /forgot-password (requestPasswordReset).
 *   2. Un admin ve la solicitud en /admin/users y genera un link de un solo
 *      uso (createPasswordResetLink), que le comparte por Google Chat.
 *   3. La persona abre el link y elige su contraseña (completePasswordReset).
 *
 * Mejor que el reset manual que ya existía (el admin inventa una contraseña
 * y se la dicta): con el link, nadie más que la persona conoce la nueva.
 * El token se maneja igual que el de invitaciones (src/lib/token.ts): 256
 * bits, solo su hash en la base, y se muestra una única vez.
 */
const LINK_TTL_MS = 24 * 60 * 60 * 1000;
const BCRYPT_COST = 12;

/**
 * Pública. NUNCA revela si el email existe: una cuenta inexistente o
 * inactiva devuelve exactamente lo mismo que una real — solo que no deja
 * nada para el admin. Pedirlo dos veces no duplica la solicitud.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await userRepository.findByEmail(email);
  if (!user || user.status !== "ACTIVE") {
    logger.info("password_reset_requested_for_unknown_or_inactive", {});
    return;
  }

  const open = await passwordResetRepository.findOpenByUser(user.tenantId, user._id);
  if (open?.status === "REQUESTED") {
    await passwordResetRepository.touchRequest(open._id);
  } else if (!open) {
    await passwordResetRepository.createRequest(user.tenantId, user._id);
  }
  // Si ya hay un link generado sin usar, no se abre otra solicitud: el
  // admin ya lo atendió, la persona solo tiene que usar ese link.

  // Quien lo pide no está autenticado: cualquiera que sepa el email puede
  // hacerlo. `userId` es la cuenta afectada (el log exige uno), y
  // `requestedFrom` deja claro que no fue una acción verificada de esa persona.
  await auditRepository.record({
    tenantId: user.tenantId,
    userId: user._id,
    action: "USER_PASSWORD_RESET_REQUESTED",
    resource: "user",
    resourceId: user._id,
    metadata: { email: user.email, requestedFrom: "página pública, sin iniciar sesión" },
  });
}

export type PasswordResetRequestItem = { userId: string; name: string; email: string; requestedAt: Date };

/** Para /admin/users: quién pidió ayuda y todavía no tiene link. */
export async function listPendingPasswordResetRequests(actingAdmin: RequestIdentity): Promise<PasswordResetRequestItem[]> {
  const all = await passwordResetRepository.listRequestedByTenant(actingAdmin.tenantId);
  // Una por persona: dos pedidos simultáneos pueden crear dos solicitudes
  // (el chequeo "ya hay una abierta" no es atómico) — ya vienen ordenadas
  // por fecha, así que se queda la más reciente.
  const seen = new Set<string>();
  const requests = all.filter((r) => {
    const key = r.userId.toString();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const users = await Promise.all(requests.map((r) => userRepository.findById(actingAdmin.tenantId, r.userId)));
  return requests.flatMap((r, i) => {
    const user = users[i];
    // Una persona borrada o desactivada después de pedirlo ya no aplica.
    if (!user || user.status !== "ACTIVE") return [];
    return [{ userId: user._id.toString(), name: user.name, email: user.email, requestedAt: r.requestedAt ?? r.createdAt }];
  });
}

export async function countPendingPasswordResetRequests(actingAdmin: RequestIdentity): Promise<number> {
  return (await listPendingPasswordResetRequests(actingAdmin)).length;
}

/**
 * Admin: genera el link (con o sin solicitud previa). Invalida cualquier
 * link anterior de esa persona — solo el último sirve.
 */
export async function createPasswordResetLink(actingAdmin: RequestIdentity, targetUserId: ObjectId) {
  const user = await userRepository.findById(actingAdmin.tenantId, targetUserId);
  if (!user) throw new NotFoundError();
  if (user.status !== "ACTIVE") {
    throw new ValidationError("Esta cuenta está desactivada — reactívala antes de generar un enlace de contraseña.");
  }

  const rawToken = generateToken();
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);
  await passwordResetRepository.createLink({
    tenantId: actingAdmin.tenantId,
    userId: user._id,
    tokenHash: hashToken(rawToken),
    expiresAt,
    createdBy: actingAdmin.userId,
  });

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "USER_PASSWORD_RESET_LINK_CREATED",
    resource: "user",
    resourceId: user._id,
    metadata: { email: user.email },
  });

  const firstName = user.name.trim().split(" ")[0] || user.name;
  const link = `${env.appUrl}/reset-password/${rawToken}`;
  const message = `Hola, ${firstName}: para elegir una nueva contraseña de Imagine Apps, entra aquí (el enlace vence en 24 horas y sirve una sola vez): ${link}`;
  return { link, message, expiresAt };
}

/** Admin: la solicitud se resolvió por otro lado (ej. restablecimiento manual). */
export async function dismissPasswordResetRequest(actingAdmin: RequestIdentity, targetUserId: ObjectId) {
  const user = await userRepository.findById(actingAdmin.tenantId, targetUserId);
  if (!user) throw new NotFoundError();
  const dismissed = await passwordResetRepository.dismissOpenForUser(actingAdmin.tenantId, user._id);
  if (dismissed === 0) throw new NotFoundError("Esta persona no tiene una solicitud pendiente.");

  await auditRepository.record({
    tenantId: actingAdmin.tenantId,
    userId: actingAdmin.userId,
    action: "USER_PASSWORD_RESET_REQUEST_DISMISSED",
    resource: "user",
    resourceId: user._id,
    metadata: { email: user.email },
  });
}

/** Pública: para mostrar el formulario (a qué cuenta corresponde el link). */
export async function previewPasswordReset(rawToken: string): Promise<{ email: string; name: string }> {
  const reset = await passwordResetRepository.findValidByTokenHash(hashToken(rawToken));
  if (!reset) throw new NotFoundError("Este enlace no es válido o ya venció.");
  const user = await userRepository.findById(reset.tenantId, reset.userId);
  if (!user || user.status !== "ACTIVE") throw new NotFoundError("Este enlace no es válido o ya venció.");
  return { email: user.email, name: user.name };
}

/**
 * Pública: la persona elige su nueva contraseña. El link se consume de
 * forma atómica ANTES de escribir la contraseña — si dos envíos llegan a la
 * vez, solo uno pasa.
 */
export async function completePasswordReset(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const pending = await passwordResetRepository.findValidByTokenHash(tokenHash);
  if (!pending) throw new NotFoundError("Este enlace no es válido o ya venció.");
  const user = await userRepository.findById(pending.tenantId, pending.userId);
  if (!user || user.status !== "ACTIVE") throw new NotFoundError("Este enlace no es válido o ya venció.");

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  const consumed = await passwordResetRepository.consume(tokenHash);
  if (!consumed) throw new NotFoundError("Este enlace no es válido o ya venció.");

  const updated = await userRepository.updatePasswordHash(consumed.tenantId, consumed.userId, passwordHash);
  if (!updated) throw new NotFoundError("Este enlace no es válido o ya venció.");

  await auditRepository.record({
    tenantId: consumed.tenantId,
    userId: consumed.userId,
    action: "USER_PASSWORD_RESET_COMPLETED",
    resource: "user",
    resourceId: consumed.userId,
    metadata: { email: updated.email },
  });
}
