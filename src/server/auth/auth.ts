import NextAuth, { CredentialsSignin, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { JWT } from "next-auth/jwt";
import { authenticateUser } from "@/server/services/auth.service";
import {
  assertLoginNotRateLimited,
  clearLoginAttempts,
  extractIp,
  recordFailedLogin,
} from "@/server/services/rate-limit.service";
import { RateLimitedError } from "@/server/errors";

const EIGHT_HOURS_IN_SECONDS = 60 * 60 * 8;

// code queda en la URL de error (?code=rate_limited) — no revela nada
// sensible, es justo el tipo de código que @auth/core espera que sea
// público (ver el comment en CredentialsSignin.code de la librería).
class RateLimitedSignInError extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: EIGHT_HOURS_IN_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials, request) => {
        const email = typeof credentials?.email === "string" ? credentials.email : undefined;
        const password = typeof credentials?.password === "string" ? credentials.password : undefined;
        if (!email || !password) return null;

        const ip = extractIp(request);

        try {
          await assertLoginNotRateLimited(email, ip);
        } catch (error) {
          if (error instanceof RateLimitedError) throw new RateLimitedSignInError();
          throw error;
        }

        const identity = await authenticateUser({ email, password });
        if (!identity) {
          await recordFailedLogin(email, ip);
          return null;
        }

        await clearLoginAttempts(email, ip);

        // Este objeto es lo único que NextAuth persiste en el JWT (vía el
        // callback jwt de abajo): pura identidad, nunca rol ni status.
        return { id: identity.userId.toString(), tenantId: identity.tenantId.toString() };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    session({ session, token }: { session: Session; token: JWT }) {
      if (token.userId) session.userId = token.userId;
      if (token.tenantId) session.tenantId = token.tenantId;
      return session;
    },
  },
});
