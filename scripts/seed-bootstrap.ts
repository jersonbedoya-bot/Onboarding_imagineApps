/**
 * Seed idempotente de arranque: tenant "Imagine Apps", roles funcionales
 * (PDM, UX_UI_DESIGNER) y el primer usuario ADMIN.
 *
 * Idempotente de verdad: si algo ya existe, NO lo toca — no resetea el
 * password del admin en un re-run. Existe → skip; no existe → crea.
 *
 * Es el único usuario que no pasa por el flujo de invitación (ese todavía
 * no existe en Fase 1).
 *
 * Uso: npm run db:seed
 */
import bcrypt from "bcryptjs";
import { logger } from "../src/lib/logger";
import { normalizeEmail } from "../src/lib/email";
import * as tenantRepository from "../src/server/repositories/tenant.repository";
import * as roleRepository from "../src/server/repositories/role.repository";
import * as userRepository from "../src/server/repositories/user.repository";
import { FUNCTIONAL_ROLE_KEYS } from "../src/types/enums";

const TENANT_SLUG = "imagine-apps";
const TENANT_NAME = "Imagine Apps";
const ROLE_LABELS: Record<(typeof FUNCTIONAL_ROLE_KEYS)[number], string> = {
  PDM: "PDM",
  UX_UI_DESIGNER: "UX/UI Designer",
};
const BCRYPT_COST = 12;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable for seeding: ${name}`);
  }
  return value;
}

async function ensureTenant() {
  const existing = await tenantRepository.findBySlug(TENANT_SLUG);
  if (existing) {
    logger.info("seed_tenant_skipped", { slug: TENANT_SLUG, reason: "already_exists" });
    return existing;
  }
  const created = await tenantRepository.create({ name: TENANT_NAME, slug: TENANT_SLUG });
  logger.info("seed_tenant_created", { slug: TENANT_SLUG });
  return created;
}

async function ensureRoles(tenantId: Awaited<ReturnType<typeof ensureTenant>>["_id"]) {
  for (const key of FUNCTIONAL_ROLE_KEYS) {
    const existing = await roleRepository.findByKey(tenantId, key);
    if (existing) {
      logger.info("seed_role_skipped", { key, reason: "already_exists" });
      continue;
    }
    await roleRepository.create({ tenantId, key, label: ROLE_LABELS[key] });
    logger.info("seed_role_created", { key });
  }
}

async function ensureAdmin(tenantId: Awaited<ReturnType<typeof ensureTenant>>["_id"]) {
  const email = requiredEnv("SEED_ADMIN_EMAIL");
  const password = requiredEnv("SEED_ADMIN_PASSWORD");
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    logger.info("seed_admin_skipped", { email: normalizeEmail(email), reason: "already_exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await userRepository.create({
    tenantId,
    email,
    name,
    passwordHash,
    platformRole: "ADMIN",
    functionalRoleId: null,
    status: "ACTIVE",
  });
  logger.info("seed_admin_created", { email: normalizeEmail(email) });
}

type TestUserEnvVars = { emailVar: string; passwordVar: string; nameVar: string; defaultName: string };

/**
 * Usuario funcional ya activo, SOLO PARA DESARROLLO — para poder entrar
 * directo a /onboarding con un rol dado sin correr el flujo manual de
 * invitación cada vez. Opcional a propósito: si las env vars de email/
 * password no están seteadas (ej. en un entorno real), no hace nada. A
 * diferencia del admin, sí pasa por el mismo shape que crearía
 * acceptInvitation (USER activo con rol funcional ya asignado) — es un
 * atajo de datos, no un camino de código nuevo.
 */
async function ensureTestFunctionalUser(
  tenantId: Awaited<ReturnType<typeof ensureTenant>>["_id"],
  roleKey: (typeof FUNCTIONAL_ROLE_KEYS)[number],
  vars: TestUserEnvVars,
) {
  const email = process.env[vars.emailVar];
  const password = process.env[vars.passwordVar];
  if (!email || !password) {
    logger.info("seed_test_user_skipped", { role: roleKey, reason: `${vars.emailVar}/${vars.passwordVar} no están seteados` });
    return;
  }

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    logger.info("seed_test_user_skipped", { role: roleKey, email: normalizeEmail(email), reason: "already_exists" });
    return;
  }

  const role = await roleRepository.findByKey(tenantId, roleKey);
  if (!role) {
    logger.error("seed_test_user_failed", { role: roleKey, reason: "rol no existe todavía — no debería pasar después de ensureRoles" });
    return;
  }

  const name = process.env[vars.nameVar] ?? vars.defaultName;
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await userRepository.create({
    tenantId,
    email,
    name,
    passwordHash,
    platformRole: "USER",
    functionalRoleId: role._id,
    status: "ACTIVE",
  });
  logger.info("seed_test_user_created", { role: roleKey, email: normalizeEmail(email) });
}

async function main() {
  const tenant = await ensureTenant();
  await ensureRoles(tenant._id);
  await ensureAdmin(tenant._id);
  await ensureTestFunctionalUser(tenant._id, "PDM", {
    emailVar: "SEED_PDM_EMAIL",
    passwordVar: "SEED_PDM_PASSWORD",
    nameVar: "SEED_PDM_NAME",
    defaultName: "PDM de prueba",
  });
  await ensureTestFunctionalUser(tenant._id, "UX_UI_DESIGNER", {
    emailVar: "SEED_UX_EMAIL",
    passwordVar: "SEED_UX_PASSWORD",
    nameVar: "SEED_UX_NAME",
    defaultName: "UX/UI de prueba",
  });

  logger.info("seed_completed", {});
  process.exit(0);
}

main().catch((error) => {
  logger.error("seed_failed", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
