/**
 * Bootstrap de base de datos — crea las colecciones con sus validadores
 * $jsonSchema (defensa en profundidad detrás de Zod, ver PRD punto 7)
 * y sus índices, según la arquitectura aprobada.
 *
 * Idempotente: no falla si una colección ya existe. No modifica el
 * validador de una colección existente (eso es un collMod explícito,
 * fuera de alcance del MVP — ver "versionamiento futuro" en el PRD).
 *
 * Uso: npm run db:bootstrap
 */
import type { CreateIndexesOptions, Db, Document, IndexSpecification } from "mongodb";
import { MongoClient } from "mongodb";
import { env } from "../src/server/config/env";
import { logger } from "../src/lib/logger";

const DB_NAME = "onboarding";

type IndexDef = {
  spec: IndexSpecification;
  options?: CreateIndexesOptions;
};

type CollectionDef = {
  name: string;
  validator?: Document;
  indexes: IndexDef[];
};

const objectId = { bsonType: "objectId" };
const date = { bsonType: "date" };
const emailPattern = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";

const collections: CollectionDef[] = [
  {
    name: "tenants",
    indexes: [{ spec: { slug: 1 }, options: { unique: true } }],
  },
  {
    name: "users",
    // Defensa en profundidad: Zod ya valida en el borde de la API.
    // Este validador evita que un Service escriba un documento malformado.
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["tenantId", "email", "name", "platformRole", "status", "createdAt"],
        properties: {
          tenantId: objectId,
          email: { bsonType: "string", pattern: emailPattern },
          name: { bsonType: "string", minLength: 1 },
          passwordHash: { bsonType: ["string", "null"] },
          platformRole: { enum: ["USER", "ADMIN"] },
          functionalRoleId: { bsonType: ["objectId", "null"] },
          status: { enum: ["INVITED", "ACTIVE", "INACTIVE"] },
          createdAt: date,
        },
      },
    },
    indexes: [
      // Email único GLOBAL (decisión de producto: una cuenta = un tenant, login sin selección de tenant).
      { spec: { email: 1 }, options: { unique: true } },
      { spec: { tenantId: 1, platformRole: 1 } },
      { spec: { tenantId: 1, functionalRoleId: 1 } },
    ],
  },
  {
    name: "roles",
    indexes: [{ spec: { tenantId: 1, key: 1 }, options: { unique: true } }],
  },
  {
    name: "invitations",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["tenantId", "email", "functionalRoleId", "tokenHash", "status", "expiresAt", "createdAt"],
        properties: {
          tenantId: objectId,
          email: { bsonType: "string", pattern: emailPattern },
          functionalRoleId: objectId,
          tokenHash: { bsonType: "string" },
          status: { enum: ["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"] },
          expiresAt: date,
          acceptedAt: { bsonType: ["date", "null"] },
          invitedBy: objectId,
          createdAt: date,
        },
      },
    },
    indexes: [
      { spec: { tokenHash: 1 }, options: { unique: true } },
      { spec: { tenantId: 1, email: 1 } },
      { spec: { status: 1, expiresAt: 1 } },
    ],
  },
  {
    name: "onboarding_routes",
    indexes: [{ spec: { tenantId: 1, roleId: 1 } }],
  },
  {
    name: "onboarding_stages",
    indexes: [{ spec: { tenantId: 1, routeId: 1, order: 1 } }],
  },
  {
    name: "content_items",
    indexes: [
      { spec: { tenantId: 1, stageId: 1, order: 1 } },
      { spec: { tenantId: 1, status: 1 } },
      { spec: { tenantId: 1, roleIds: 1 } },
    ],
  },
  {
    name: "leaders",
    indexes: [{ spec: { tenantId: 1, status: 1 } }],
  },
  {
    name: "processes",
    indexes: [
      { spec: { tenantId: 1, roleId: 1, status: 1 } },
      { spec: { tenantId: 1, stageId: 1, order: 1 } },
    ],
  },
  {
    name: "process_steps",
    indexes: [{ spec: { tenantId: 1, processId: 1, order: 1 } }],
  },
  {
    name: "user_progress",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["tenantId", "userId", "stepId", "processId", "stageId", "status", "updatedAt"],
        properties: {
          tenantId: objectId,
          userId: objectId,
          stepId: objectId,
          processId: objectId,
          stageId: objectId,
          status: { enum: ["PENDING", "IN_PROGRESS", "COMPLETED"] },
          startedAt: { bsonType: ["date", "null"] },
          completedAt: { bsonType: ["date", "null"] },
          updatedAt: date,
        },
      },
    },
    indexes: [
      { spec: { tenantId: 1, userId: 1, stepId: 1 }, options: { unique: true } },
      { spec: { tenantId: 1, userId: 1, stageId: 1 } },
      { spec: { tenantId: 1, userId: 1 } },
    ],
  },
  {
    name: "media",
    indexes: [{ spec: { tenantId: 1, createdAt: -1 } }],
  },
  {
    name: "audit_logs",
    indexes: [
      { spec: { tenantId: 1, timestamp: -1 } },
      { spec: { tenantId: 1, userId: 1, timestamp: -1 } },
    ],
  },
];

async function ensureCollection(db: Db, def: CollectionDef): Promise<void> {
  const existing = await db.listCollections({ name: def.name }).toArray();

  if (existing.length === 0) {
    await db.createCollection(
      def.name,
      def.validator
        ? { validator: def.validator, validationLevel: "strict", validationAction: "error" }
        : undefined,
    );
    logger.info("collection_created", { collection: def.name });
  } else {
    logger.info("collection_already_exists", { collection: def.name });
  }

  for (const index of def.indexes) {
    const indexName = await db.collection(def.name).createIndex(index.spec, index.options);
    logger.info("index_ensured", { collection: def.name, index: indexName });
  }
}

async function main() {
  const client = new MongoClient(env.mongodbUri);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    for (const def of collections) {
      await ensureCollection(db, def);
    }
    logger.info("bootstrap_completed", { collections: collections.length });
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  logger.error("bootstrap_failed", { message: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
