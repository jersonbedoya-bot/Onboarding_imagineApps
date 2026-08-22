import { MongoClient, type Db } from "mongodb";
import { env } from "@/server/config/env";

const DB_NAME = "onboarding";

// En serverless (Vercel), cada invocación "fría" crea una instancia nueva del módulo,
// pero las invocaciones "calientes" reutilizan el mismo proceso: cacheamos la conexión
// en globalThis para no abrir una conexión a Mongo por request.
//
// La conexión se abre recién en el primer getDb() (no al importar el módulo), para
// que los tests de integración puedan fijar MONGODB_URI a un Mongo en memoria antes
// de que cualquier código toque la base real.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  const client = new MongoClient(env.mongodbUri);
  return client.connect();
}

export async function getDb(): Promise<Db> {
  const clientPromise = globalThis._mongoClientPromise ?? connect();
  globalThis._mongoClientPromise = clientPromise;
  const client = await clientPromise;
  return client.db(DB_NAME);
}
