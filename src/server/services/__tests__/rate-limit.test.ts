import { describe, expect, it } from "vitest";
import * as rateLimitService from "@/server/services/rate-limit.service";
import * as rateLimitRepository from "@/server/repositories/rate-limit.repository";
import { RateLimitedError } from "@/server/errors";
import { getDb } from "@/server/db/client";

describe("rate limiting — login", () => {
  it("permite hasta 5 intentos fallidos y bloquea el 6to (misma clave de email)", async () => {
    const email = "victima@example.com";

    for (let i = 0; i < 5; i++) {
      await expect(rateLimitService.assertLoginNotRateLimited(email, null)).resolves.not.toThrow();
      await rateLimitService.recordFailedLogin(email, null);
    }

    await expect(rateLimitService.assertLoginNotRateLimited(email, null)).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("un login exitoso resetea el contador de esa clave", async () => {
    const email = "usuario-normal@example.com";

    for (let i = 0; i < 4; i++) {
      await rateLimitService.recordFailedLogin(email, null);
    }
    await expect(rateLimitService.assertLoginNotRateLimited(email, null)).resolves.not.toThrow();

    await rateLimitService.clearLoginAttempts(email, null);

    // Después de limpiar, vuelve a tener margen completo.
    for (let i = 0; i < 4; i++) {
      await expect(rateLimitService.assertLoginNotRateLimited(email, null)).resolves.not.toThrow();
      await rateLimitService.recordFailedLogin(email, null);
    }
    await expect(rateLimitService.assertLoginNotRateLimited(email, null)).resolves.not.toThrow();
  });

  it("password spraying: misma IP contra muchos emails distintos también bloquea, aunque cada email individual tenga pocos intentos", async () => {
    const ip = "203.0.113.7";

    for (let i = 0; i < 5; i++) {
      const email = `victima-${i}@example.com`;
      await expect(rateLimitService.assertLoginNotRateLimited(email, ip)).resolves.not.toThrow();
      await rateLimitService.recordFailedLogin(email, ip);
    }

    // Un email NUEVO (nunca antes usado) todavía queda bloqueado, porque
    // la dimensión IP ya llegó a su límite.
    await expect(rateLimitService.assertLoginNotRateLimited("email-nuevo@example.com", ip)).rejects.toBeInstanceOf(
      RateLimitedError,
    );
  });

  it("bloquear a una IP no bloquea a otro usuario legítimo con distinta IP (no hay lockout cruzado de víctima)", async () => {
    const attackerIp = "203.0.113.9";
    const victimEmail = "victima-aislada@example.com";

    for (let i = 0; i < 5; i++) {
      await rateLimitService.recordFailedLogin(`otro-${i}@example.com`, attackerIp);
    }

    // La víctima, desde SU propia IP, nunca intentó nada -> sigue con margen completo.
    await expect(rateLimitService.assertLoginNotRateLimited(victimEmail, "198.51.100.1")).resolves.not.toThrow();
  });

  it("sin IP disponible (caso local, sin proxy) solo limita por email", async () => {
    const email = "sin-ip@example.com";
    for (let i = 0; i < 5; i++) {
      await rateLimitService.recordFailedLogin(email, null);
    }
    await expect(rateLimitService.assertLoginNotRateLimited(email, null)).rejects.toBeInstanceOf(RateLimitedError);
    // Otro email, sin IP, no se ve afectado.
    await expect(rateLimitService.assertLoginNotRateLimited("otro@example.com", null)).resolves.not.toThrow();
  });
});

describe("rate limiting — accept-invite", () => {
  it("permite hasta 3 intentos fallidos y bloquea el 4to (misma clave de token)", async () => {
    const token = "token-de-prueba";

    for (let i = 0; i < 3; i++) {
      await expect(rateLimitService.assertAcceptInviteNotRateLimited(token)).resolves.not.toThrow();
      await rateLimitService.recordFailedAcceptInvite(token);
    }

    await expect(rateLimitService.assertAcceptInviteNotRateLimited(token)).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("un token distinto no se ve afectado por los fallos de otro", async () => {
    const tokenA = "token-atacado";
    const tokenB = "token-legitimo";

    for (let i = 0; i < 3; i++) {
      await rateLimitService.recordFailedAcceptInvite(tokenA);
    }

    await expect(rateLimitService.assertAcceptInviteNotRateLimited(tokenB)).resolves.not.toThrow();
  });
});

describe("rate_limit_attempts — la query de conteo usa índice", () => {
  it("countActive no cae en COLLSCAN", async () => {
    await rateLimitRepository.recordAttempt("login", "email:x@example.com", 15 * 60 * 1000);

    const database = await getDb();
    const explained = await database
      .collection("rate_limit_attempts")
      .find({ scope: "login", identifier: "email:x@example.com", expiresAt: { $gt: new Date() } })
      .explain("executionStats");

    function findStage(node: any, stage: string): boolean {
      if (!node) return false;
      if (node.stage === stage) return true;
      if (node.inputStage) return findStage(node.inputStage, stage);
      if (node.inputStages) return node.inputStages.some((s: any) => findStage(s, stage));
      return false;
    }

    expect(findStage(explained.queryPlanner.winningPlan, "COLLSCAN")).toBe(false);
    expect(findStage(explained.queryPlanner.winningPlan, "IXSCAN")).toBe(true);
  });
});
