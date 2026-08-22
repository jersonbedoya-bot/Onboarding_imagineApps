import { MongoClient, type Db } from "mongodb";
import { env } from "@/server/config/env";

const DB_NAME = "onboarding";

// En serverless (Vercel), cada invocación "fría" crea una instancia nueva del módulo,
// pero las invocaciones "calientes" reutilizan el mismo proceso: cacheamos la conexión
// en globalThis para no abrir una conexión a Mongo por request.
declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  const client = new MongoClient(env.mongodbUri);
  return client.connect();
}

const clientPromise = globalThis._mongoClientPromise ?? connect();
globalThis._mongoClientPromise = clientPromise;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}
