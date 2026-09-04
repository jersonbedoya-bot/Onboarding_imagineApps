/**
 * Fuente única de verdad del schema de Mongo: colecciones, validadores
 * $jsonSchema e índices. La usan tanto scripts/bootstrap-db.ts (Atlas
 * real) como el setup de tests de integración (Mongo en memoria) —
 * nunca duplicar esta definición en otro lado.
 *
 * VERIFICADO en Fase 5: este archivo refleja el estado final correcto.
 * Se comparó, colección por colección, `bootstrapSchema()` sobre un
 * Mongo temporal 100% vacío (no el Atlas de desarrollo) contra el
 * estado real del Atlas de desarrollo — mismas colecciones, mismos
 * índices, mismos validadores en las 14. Un `npm run db:bootstrap`
 * contra una base nueva y vacía no necesita ningún paso manual.
 *
 * Para una base EXISTENTE que ya venía de fases anteriores, en cambio,
 * `db:bootstrap` NO alcanza — `ensureCollection` nunca modifica el
 * validador ni dropea índices viejos de una colección que ya existe (ver
 * comentario en scripts/bootstrap-db.ts). Las migraciones manuales
 * aplicadas a mano contra Atlas (y cómo replicarlas en otra base con
 * historia previa) están documentadas en MIGRATIONS.md, no acá.
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
          platformRole: { enum: ["USER", "EDITOR", "ADMIN"] },
          functionalRoleId: { bsonType: ["objectId", "null"] },
          status: { enum: ["INVITED", "ACTIVE", "INACTIVE"] },
          createdAt: date,
        },
      },
    },
    indexes: [
      // Email único GLOBAL (decisión de producto: una cuenta = un tenant, login sin selección de tenant).
      { spec: { email: 1 }, options: { unique: true } },
      { spec: { tenantId: 1, functionalRoleId: 1 } },
      // Fase 5 (explain()): user.repository.listByTenant filtra por tenantId
      // y ordena por createdAt — sin este índice, Mongo hacía SORT en
      // memoria trayendo TODOS los usuarios del tenant antes de paginar.
      { spec: { tenantId: 1, createdAt: -1 } },
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
        required: ["tenantId", "email", "platformRole", "functionalRoleId", "tokenHash", "status", "expiresAt", "createdAt"],
        properties: {
          tenantId: objectId,
          email: { bsonType: "string", pattern: emailPattern },
          // ADMIN no tiene rol funcional (functionalRoleId: null) — ver
          // MIGRATIONS.md, invitación de administradores.
          platformRole: { enum: ["USER", "EDITOR", "ADMIN"] },
          functionalRoleId: { bsonType: ["objectId", "null"] },
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
    // Referencia polimórfica (ver PROGRESS_TARGET_TYPES en src/types/enums.ts
    // y la decisión de Fase 4): un registro = un hecho puntual de
    // completado, para un STEP, un CONTENT_ITEM (solo OBLIGATORY) o un
    // STAGE (el hecho sticky "esta etapa quedó completa para este
    // usuario"). Sin status/startedAt: nada escribe estados intermedios,
    // la existencia del documento ES "completado".
    name: "user_progress",
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["tenantId", "userId", "targetType", "targetId", "stageId", "completedAt"],
        properties: {
          tenantId: objectId,
          userId: objectId,
          targetType: { enum: ["STEP", "CONTENT_ITEM", "STAGE"] },
          targetId: objectId,
          stageId: objectId,
          processId: { bsonType: ["objectId", "null"] }, // solo cuando targetType === "STEP"
          completedAt: date,
        },
      },
    },
    indexes: [
      // Único: un usuario no puede tener dos hechos de completado para el
      // mismo target — esto es lo que hace idempotente el upsert.
      { spec: { tenantId: 1, userId: 1, targetType: 1, targetId: 1 }, options: { unique: true } },
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
      // Fase 5 (explain()): filtrar por acción sin este índice forzaba a
      // recorrer TODO el audit_logs del tenant ordenado por fecha,
      // descartando en memoria lo que no matcheaba la acción.
      { spec: { tenantId: 1, action: 1, timestamp: -1 } },
    ],
  },
  {
    // Fase 5: rate limiting de /login y /accept-invite (Redis vetado por
    // el PRD — ver punto 38). Global, no tenant-scoped: el login es por
    // email global (una cuenta = un tenant, sin selección), y accept-invite
    // se limita por token, ninguno de los dos tiene tenantId disponible
    // de antemano. `identifier` lleva un prefijo (`email:`, `ip:`,
    // `token:`) para poder compartir la misma colección entre dimensiones
    // sin que un email colisione con un token. El TTL borra intentos
    // vencidos solos; la ventana activa se calcula contando documentos
    // con expiresAt > ahora, no confiando en que el TTL ya los haya
    // limpiado (el background task de Mongo corre cada ~60s, no al instante).
    name: "rate_limit_attempts",
    indexes: [
      { spec: { scope: 1, identifier: 1, expiresAt: 1 } },
      { spec: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
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
