/**
 * Fuente única de verdad del schema de Mongo: colecciones, validadores
 * $jsonSchema e índices. La usan tanto scripts/bootstrap-db.ts (Atlas
 * real) como el setup de tests de integración (Mongo en memoria) —
 * nunca duplicar esta definición en otro lado.
 */
import type { CreateIndexesOptions, Db, Document, IndexSpecification } from "mongodb";
import { logger } from "@/lib/logger";

export const DB_NAME = "onboarding";

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

export const collections: CollectionDef[] = [
  {
    name: "tenants",
    indexes: [{ spec: { slug: 1 }, options: { unique: true } }],
  },
  {
    name: "users",
    // Defensa en profundidad: Zod ya valida en el borde de la API.
    // Este validador evita que un Service escriba un documento malformado.
    //
    // Nota sobre "INVITED" en el enum de status: el diseño actual NUNCA
    // crea un `users` en ese estado — mientras una invitación está
    // pendiente, vive solo en la colección `invitations` (que tiene su
    // propio ciclo de vida PENDING/ACCEPTED/EXPIRED/REVOKED). `users` nace
    // directo en ACTIVE, al aceptar. "INVITED" queda reservado en el
    // schema por si en el futuro se necesita representar un usuario
    // suspendido-antes-de-activar directamente en `users` — hoy es un
    // valor válido pero sin ningún código que lo escriba.
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
    // Una sola ruta por tenant (no una por rol funcional — ver decisión de
    // Fase 3A: lo común/específico vive en content_items.scope, no en la
    // estructura de la ruta). Índice único para que el upsert perezoso de
    // route.repository.getOrCreate sea atómico ante creación concurrente.
    name: "onboarding_routes",
    indexes: [{ spec: { tenantId: 1 }, options: { unique: true } }],
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
    // scope+roleIds, NO roleId singular (ver decisión de Fase 3B: mismo
    // patrón de control de acceso que content_items/leaders).
    name: "processes",
    indexes: [
      { spec: { tenantId: 1, stageId: 1, order: 1 } },
      { spec: { tenantId: 1, status: 1 } },
      { spec: { tenantId: 1, roleIds: 1 } },
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

export async function ensureCollection(db: Db, def: CollectionDef): Promise<void> {
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

export async function bootstrapSchema(db: Db): Promise<void> {
  for (const def of collections) {
    await ensureCollection(db, def);
  }
}
