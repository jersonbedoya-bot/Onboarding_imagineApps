import { afterAll, afterEach, beforeAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import { bootstrapSchema, DB_NAME } from "@/server/db/schema";

let mongod: MongoMemoryServer;
let adminClient: MongoClient;

beforeAll(async () => {
  // ⚠️ DIVERGENCIA DE VERSIÓN CON PRODUCCIÓN — leer antes de tocar esto.
  //
  // El cluster de Atlas corre MongoDB 8.0.29 (confirmado con
  // db.admin().buildInfo() el 2026-08-22). Estos tests corren contra
  // MongoDB 6.0.14, dos major versions atrás. NO es la versión que
  // querríamos usar — es la más nueva que efectivamente arranca en esta
  // máquina de desarrollo (macOS 12.7.6 / Monterey).
  //
  // El binario 8.x que mongodb-memory-server baja por default (probado:
  // 8.2.6) falla al arrancar acá con:
  //   dyld: Symbol not found: __ZTVNSt3__13pmr25monotonic_buffer_resourceE
  //   Referenced from: mongod
  //   Expected in: /usr/lib/libc++.1.dylib
  // Es decir: el mongod 8.x está linkeado contra un libc++ más nuevo del
  // que trae el sistema operativo. No es arreglable instalando otra
  // versión de Node — es una limitación del SO. Downgradear el binario de
  // prueba es el workaround estándar para este problema conocido de
  // mongodb-memory-server en macOS viejos.
  //
  // Qué SÍ cubren estos tests con 6.0.14: la lógica de aislamiento de
  // tenant (filtros por tenantId, findOneAndUpdate scoped, códigos de
  // error) y que los validadores $jsonSchema con validationLevel:"strict"
  // + validationAction:"error" rechazan documentos inválidos — ese
  // comportamiento es estable entre 6.x y 8.x.
  // Qué NO garantizan: paridad exacta de comportamiento con 8.0 en
  // features nuevas de esa major (no usamos ninguna en este proyecto,
  // pero si en el futuro se agrega algo específico de 8.x, este test
  // runner no lo va a detectar). Si se actualiza macOS o se corren los
  // tests en CI sobre Linux, subir esta versión a 8.0.x para achicar la
  // divergencia.
  mongod = await MongoMemoryServer.create({ binary: { version: "6.0.14" } });

  // Fijamos las env vars ANTES de que cualquier repositorio abra su propia
  // conexión (getDb() es perezoso — ver server/db/client.ts y server/config/env.ts).
  process.env.MONGODB_URI = mongod.getUri();
  process.env.AUTH_SECRET = "test-secret-only-used-in-vitest";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

  adminClient = new MongoClient(mongod.getUri());
  await adminClient.connect();
  await bootstrapSchema(adminClient.db(DB_NAME));
});

afterEach(async () => {
  // Limpia datos entre tests; conserva colecciones/validadores/índices.
  const db = adminClient.db(DB_NAME);
  const existing = await db.listCollections().toArray();
  await Promise.all(existing.map((c) => db.collection(c.name).deleteMany({})));
});

afterAll(async () => {
  await adminClient.close();
  await mongod.stop();
});
