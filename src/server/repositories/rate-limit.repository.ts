import { ObjectId } from "mongodb";
import { getDb } from "@/server/db/client";

export type RateLimitScope = "login" | "accept-invite";

export type RateLimitAttemptDocument = {
  _id: ObjectId;
  scope: RateLimitScope;
  identifier: string; // "email:x@y.com" | "ip:1.2.3.4" | "token:<hash o valor>"
  createdAt: Date;
  expiresAt: Date; // TTL — ver índice en schema.ts
};

async function collection() {
  const db = await getDb();
  return db.collection<RateLimitAttemptDocument>("rate_limit_attempts");
}

/** Cuenta intentos todavía "activos" (dentro de la ventana) para esta clave. */
export async function countActive(scope: RateLimitScope, identifier: string): Promise<number> {
  return (await collection()).countDocuments({ scope, identifier, expiresAt: { $gt: new Date() } });
}

export async function recordAttempt(scope: RateLimitScope, identifier: string, windowMs: number): Promise<void> {
  const now = new Date();
  await (await collection()).insertOne({
    _id: new ObjectId(),
    scope,
    identifier,
    createdAt: now,
    expiresAt: new Date(now.getTime() + windowMs),
  });
}

/** Se llama en un login exitoso: resetea el contador de esa clave. */
export async function clearAttempts(scope: RateLimitScope, identifier: string): Promise<void> {
  await (await collection()).deleteMany({ scope, identifier });
}
