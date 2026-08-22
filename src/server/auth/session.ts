import { cache } from "react";
import { ObjectId } from "mongodb";
import { auth } from "@/server/auth/auth";
import { findAuthContextById } from "@/server/repositories/user.repository";
import { UnauthorizedError, ForbiddenError } from "@/server/errors";
import type { PlatformRole, UserStatus } from "@/types/enums";

export type RequestIdentity = {
  userId: ObjectId;
  tenantId: ObjectId;
  status: UserStatus;
  platformRole: PlatformRole;
  functionalRoleId: ObjectId | null;
};

/**
 * Guard de autoridad — se llama en CADA request protegida (Route Handler
 * o Server Component), nunca solo en Proxy.
 *
 * El JWT solo prueba identidad (userId, tenantId): son claims firmados,
 * confiables, pero potencialmente desactualizados durante toda la
 * duración del token (8h). La autoridad (status, platformRole,
 * functionalRoleId) SIEMPRE sale de este read a Mongo, nunca del JWT,
 * para que una desactivación o cambio de rol por parte de un admin
 * tenga efecto inmediato y no dependa de que el token expire.
 *
 * cache() memoiza el resultado dentro de un mismo render pass del
 * servidor (varios Server Components pidiendo la sesión en el mismo
 * request no disparan múltiples reads).
 */
export const requireActiveUser = cache(async (): Promise<RequestIdentity> => {
  const session = await auth();

  if (!session?.userId || !session.tenantId) {
    throw new UnauthorizedError();
  }

  const userId = new ObjectId(session.userId);
  const authContext = await findAuthContextById(userId);

  if (!authContext || authContext.status !== "ACTIVE") {
    // Cuenta borrada, desactivada, o todavía INVITED: la sesión deja de
    // ser válida aunque el JWT no haya expirado.
    throw new UnauthorizedError();
  }

  return {
    userId,
    tenantId: new ObjectId(session.tenantId),
    status: authContext.status,
    platformRole: authContext.platformRole,
    functionalRoleId: authContext.functionalRoleId,
  };
});

export async function requireAdmin(): Promise<RequestIdentity> {
  const identity = await requireActiveUser();
  if (identity.platformRole !== "ADMIN") {
    throw new ForbiddenError();
  }
  return identity;
}
