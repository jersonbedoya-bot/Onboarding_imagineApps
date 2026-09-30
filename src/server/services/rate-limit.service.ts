import { RateLimitedError } from "@/server/errors";
import { normalizeEmail } from "@/lib/email";
import { hashToken } from "@/lib/token";
import * as rateLimitRepository from "@/server/repositories/rate-limit.repository";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

// accept-invite no tiene una ventana explícitamente acordada — reuso la
// misma de login (15 min) por consistencia. Ajustar si hace falta.
const LOGIN = { maxAttempts: 5, windowMs: FIFTEEN_MINUTES_MS };
const ACCEPT_INVITE = { maxAttempts: 3, windowMs: FIFTEEN_MINUTES_MS };
// Pedir ayuda con la contraseña no expone nada (la respuesta es siempre la
// misma), pero sin límite alguien podría llenar la lista del admin.
const FORGOT_PASSWORD = { maxAttempts: 3, windowMs: FIFTEEN_MINUTES_MS };
const RESET_PASSWORD = { maxAttempts: 5, windowMs: FIFTEEN_MINUTES_MS };
const RESET_PASSWORD_PER_IP = { maxAttempts: 20, windowMs: FIFTEEN_MINUTES_MS };

function emailKey(email: string): string {
  return `email:${normalizeEmail(email)}`;
}

function ipKey(ip: string): string {
  return `ip:${ip}`;
}

// Hash, no el token crudo: un intento fallido con un token VÁLIDO (ej.
// cuenta desactivada) dejaba el token usable guardado en texto plano en
// rate_limit_attempts — justo lo que invitations/password_resets evitan.
function tokenKey(token: string): string {
  return `token:${hashToken(token)}`;
}

/**
 * Extrae la IP del request para rate limiting.
 *
 * Medido en Fase 5 (curl directo a `next dev`, sin proxy): el runtime de
 * Next 16 en local SÍ entrega `x-forwarded-for` (con la loopback, `::1`,
 * derivada del socket) — la suposición original de que en local esto
 * daría null era incorrecta, corregida acá tras confirmarlo con un
 * request real. Lo que sigue sin confirmar es específico de Vercel: que
 * el valor en producción sea el del cliente real y no falseable (Vercel
 * sobreescribe este header en su proxy de borde, no lo reenvía tal cual
 * lo manda el cliente) — eso se confirma en la fase de deploy, no acá.
 * `extractIp` igual devuelve null si el header faltara por completo, así
 * que el chequeo de login sigue siendo robusto a ausencia total del header.
 */
export function extractIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (!forwardedFor) return null;
  return forwardedFor.split(",")[0]?.trim() || null;
}

/**
 * Login: dos dimensiones, identifier (email) e IP — la que dispare
 * primero bloquea. Cubre password spraying (muchos emails, misma IP) sin
 * poder tumbar a una víctima puntual solo por su email (esa dimensión
 * tiene su propio contador, independiente del de IP).
 */
export async function assertLoginNotRateLimited(email: string, ip: string | null): Promise<void> {
  const identifierCount = await rateLimitRepository.countActive("login", emailKey(email));
  if (identifierCount >= LOGIN.maxAttempts) throw new RateLimitedError();

  if (ip) {
    const ipCount = await rateLimitRepository.countActive("login", ipKey(ip));
    if (ipCount >= LOGIN.maxAttempts) throw new RateLimitedError();
  }
}

export async function recordFailedLogin(email: string, ip: string | null): Promise<void> {
  await rateLimitRepository.recordAttempt("login", emailKey(email), LOGIN.windowMs);
  if (ip) await rateLimitRepository.recordAttempt("login", ipKey(ip), LOGIN.windowMs);
}

export async function clearLoginAttempts(email: string, ip: string | null): Promise<void> {
  await rateLimitRepository.clearAttempts("login", emailKey(email));
  if (ip) await rateLimitRepository.clearAttempts("login", ipKey(ip));
}

/** accept-invite: una sola dimensión, el token de la invitación. */
export async function assertAcceptInviteNotRateLimited(token: string): Promise<void> {
  const count = await rateLimitRepository.countActive("accept-invite", tokenKey(token));
  if (count >= ACCEPT_INVITE.maxAttempts) throw new RateLimitedError();
}

export async function recordFailedAcceptInvite(token: string): Promise<void> {
  await rateLimitRepository.recordAttempt("accept-invite", tokenKey(token), ACCEPT_INVITE.windowMs);
}

/**
 * "Olvidé mi contraseña": cuenta CADA pedido (no solo fallos — un pedido
 * nunca "falla" hacia afuera), por email y por IP, igual que login.
 */
export async function assertForgotPasswordNotRateLimited(email: string, ip: string | null): Promise<void> {
  if ((await rateLimitRepository.countActive("forgot-password", emailKey(email))) >= FORGOT_PASSWORD.maxAttempts) {
    throw new RateLimitedError();
  }
  if (ip && (await rateLimitRepository.countActive("forgot-password", ipKey(ip))) >= FORGOT_PASSWORD.maxAttempts) {
    throw new RateLimitedError();
  }
}

export async function recordForgotPassword(email: string, ip: string | null): Promise<void> {
  await rateLimitRepository.recordAttempt("forgot-password", emailKey(email), FORGOT_PASSWORD.windowMs);
  if (ip) await rateLimitRepository.recordAttempt("forgot-password", ipKey(ip), FORGOT_PASSWORD.windowMs);
}

/**
 * /reset-password/[token]: por token (mismo criterio que accept-invite) y
 * además por IP — probar tokens inventados crea una clave nueva por token,
 * así que sin la dimensión IP nada frenaría una ráfaga de intentos.
 */
export async function assertResetPasswordNotRateLimited(token: string, ip: string | null): Promise<void> {
  if ((await rateLimitRepository.countActive("reset-password", tokenKey(token))) >= RESET_PASSWORD.maxAttempts) {
    throw new RateLimitedError();
  }
  if (ip && (await rateLimitRepository.countActive("reset-password", ipKey(ip))) >= RESET_PASSWORD_PER_IP.maxAttempts) {
    throw new RateLimitedError();
  }
}

export async function recordFailedResetPassword(token: string, ip: string | null): Promise<void> {
  await rateLimitRepository.recordAttempt("reset-password", tokenKey(token), RESET_PASSWORD.windowMs);
  if (ip) await rateLimitRepository.recordAttempt("reset-password", ipKey(ip), RESET_PASSWORD_PER_IP.windowMs);
}
