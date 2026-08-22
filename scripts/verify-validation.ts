/**
 * Verifica que los validadores $jsonSchema de bootstrap-db.ts están
 * realmente activos en Mongo (no solo declarados en el código).
 *
 * Para cada colección crítica, intenta insertar un documento con un
 * valor de enum inválido. Si Mongo lo rechaza → el validador funciona.
 * Si Mongo lo acepta → falla la verificación, se borra el doc insertado
 * por error y el proceso termina con exit code 1.
 *
 * Uso: npm run db:verify
 */
import type { Document } from "mongodb";
import { MongoClient, MongoServerError, ObjectId } from "mongodb";
import { env } from "../src/server/config/env";
import { logger } from "../src/lib/logger";

const DB_NAME = "onboarding";
// Código de error de MongoDB para "Document failed validation".
const VALIDATION_FAILURE_CODE = 121;
const MARKER = "__schema_verification_probe__";

type Check = {
  collection: string;
  invalidField: string;
  invalidValue: string;
  buildDoc: () => Document;
};

const checks: Check[] = [
  {
    collection: "users",
    invalidField: "platformRole",
    invalidValue: "SUPERADMIN",
    buildDoc: () => ({
      tenantId: new ObjectId(),
      email: "schema-verification@example.com",
      name: "Schema Verification",
      platformRole: "SUPERADMIN", // inválido: enum es USER | ADMIN
      status: "ACTIVE",
      createdAt: new Date(),
      [MARKER]: true,
    }),
  },
  {
    collection: "invitations",
    invalidField: "status",
    invalidValue: "APPROVED",
    buildDoc: () => ({
      tenantId: new ObjectId(),
      email: "schema-verification@example.com",
      functionalRoleId: new ObjectId(),
      tokenHash: "schema-verification-token-hash",
      status: "APPROVED", // inválido: enum es PENDING | ACCEPTED | EXPIRED | REVOKED
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      createdAt: new Date(),
      [MARKER]: true,
    }),
  },
  {
    collection: "user_progress",
    invalidField: "status",
    invalidValue: "DONE",
    buildDoc: () => ({
      tenantId: new ObjectId(),
      userId: new ObjectId(),
      stepId: new ObjectId(),
      processId: new ObjectId(),
      stageId: new ObjectId(),
      status: "DONE", // inválido: enum es PENDING | IN_PROGRESS | COMPLETED
      updatedAt: new Date(),
      [MARKER]: true,
    }),
  },
];

async function runCheck(db: import("mongodb").Db, check: Check): Promise<boolean> {
  const doc = check.buildDoc();

  try {
    const result = await db.collection(check.collection).insertOne(doc);

    // Si llegamos acá, Mongo ACEPTÓ un documento inválido: el validador no está activo.
    await db.collection(check.collection).deleteOne({ _id: result.insertedId });

    logger.error("validation_check_failed", {
      collection: check.collection,
      field: check.invalidField,
      value: check.invalidValue,
      reason: "El documento inválido fue insertado y luego borrado. El validador NO está bloqueando escrituras.",
    });
    return false;
  } catch (error) {
    if (error instanceof MongoServerError && error.code === VALIDATION_FAILURE_CODE) {
      logger.info("validation_check_passed", {
        collection: check.collection,
        field: check.invalidField,
        value: check.invalidValue,
      });
      return true;
    }

    // Cualquier otro error (conexión, permisos, etc.) no es una confirmación válida:
    // lo propagamos para no reportar un falso "OK".
    throw error;
  } finally {
    // Red de seguridad adicional: por si algo insertó el marcador fuera del flujo esperado.
    await db.collection(check.collection).deleteMany({ [MARKER]: true });
  }
}

async function main() {
  const client = new MongoClient(env.mongodbUri);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const results = await Promise.all(checks.map((check) => runCheck(db, check)));
    const allPassed = results.every(Boolean);

    logger.info("verification_summary", {
      total: checks.length,
      passed: results.filter(Boolean).length,
      failed: results.filter((r) => !r).length,
    });

    if (!allPassed) {
      logger.error("verification_failed", {
        message: "Al menos un validador $jsonSchema no está bloqueando documentos inválidos.",
      });
      process.exitCode = 1;
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  logger.error("verify_script_crashed", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
