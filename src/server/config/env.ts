function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Getters, no valores calculados una vez al importar el módulo: así el
// chequeo de "falta la variable" ocurre en el uso real, no en el import.
// Necesario para que los tests de integración puedan fijar MONGODB_URI al
// Mongo en memoria (ver __tests__/setup.ts) después de que los
// repositorios ya importaron este módulo.
export const env = {
  get mongodbUri(): string {
    return required("MONGODB_URI");
  },
  get authSecret(): string {
    return required("AUTH_SECRET");
  },
  get appUrl(): string {
    return required("NEXT_PUBLIC_APP_URL");
  },
  // No requerido en Fase 0/1/2: recién se usa al construir el flujo de media (Fase 3).
  get blobReadWriteToken(): string | undefined {
    return process.env.BLOB_READ_WRITE_TOKEN;
  },
};
