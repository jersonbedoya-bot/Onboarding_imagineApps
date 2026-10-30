/**
 * Quién queda como responsable, en la auditoría, de lo que escribe un script.
 *
 * Antes cada script tomaba "el primer admin activo" del tenant, así que todo
 * cambio hecho por script quedaba a nombre del admin más antiguo (la cuenta
 * del seed), aunque lo hubiera ejecutado otra persona — la auditoría mentía
 * sobre quién hizo el cambio (ver feedback de usuario). Ahora quien ejecuta
 * tiene que decir quién es:
 *
 *   ... ./scripts/<script>.ts --apply --as=tu.correo@imagineapps.co
 *
 * y tiene que ser un ADMIN activo del tenant.
 */
import type { ObjectId } from "mongodb";
import { getDb } from "../../src/server/db/client";
import { normalizeEmail } from "../../src/lib/email";

export function scriptActorEmail(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--as="));
  const email = arg ? normalizeEmail(arg.slice("--as=".length)) : "";
  return email || null;
}

export async function findScriptActorAdmin(tenantId: ObjectId) {
  const email = scriptActorEmail();
  if (!email) {
    throw new Error("Indica quién ejecuta el cambio, para la auditoría: --as=tu.correo@imagineapps.co");
  }
  const db = await getDb();
  const admin = await db.collection("users").findOne({ tenantId, email, platformRole: "ADMIN", status: "ACTIVE" });
  if (!admin) throw new Error(`${email} no es un ADMIN activo de este tenant.`);
  return admin;
}
