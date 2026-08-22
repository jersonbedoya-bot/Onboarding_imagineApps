import type { DefaultSession } from "next-auth";

// El JWT/sesión solo prueba IDENTIDAD (userId, tenantId) — nunca autoridad
// (platformRole, status). Esa siempre sale de requireActiveUser() vía Mongo.
declare module "next-auth" {
  interface Session {
    userId: string;
    tenantId: string;
    user: DefaultSession["user"];
  }

  interface User {
    tenantId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    tenantId?: string;
  }
}
