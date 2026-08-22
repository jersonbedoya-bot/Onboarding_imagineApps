function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  mongodbUri: required("MONGODB_URI"),
  authSecret: required("AUTH_SECRET"),
  appUrl: required("NEXT_PUBLIC_APP_URL"),
  // No requerido en Fase 0: recién se usa al construir el flujo de media (Fase 3).
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN,
};
