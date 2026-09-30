import { redirect } from "next/navigation";
import { requireActiveUser } from "@/server/auth/session";
import { ForbiddenError, UnauthorizedError } from "@/server/errors";

/**
 * Traduce el error de un guard (requireAdmin/requireContentEditor) a la
 * redirección correcta para una PÁGINA del panel.
 *
 * Antes cada page.tsx hacía `catch { redirect("/login") }`: un EDITOR con
 * sesión válida que abría una sección solo-ADMIN caía en el formulario de
 * login como si se le hubiera cerrado la sesión. Hay que distinguir:
 * - UnauthorizedError (sin sesión, o cuenta desactivada/borrada/INVITED):
 *   sí toca volver a /login.
 * - ForbiddenError (sesión válida, rol insuficiente): el EDITOR vuelve al
 *   inicio del panel con un aviso; un USER no tiene nada que hacer en el
 *   panel, así que va a su onboarding.
 * Cualquier otro error (ej. Mongo caído) se relanza para que lo muestre el
 * error boundary, en vez de disfrazarlo de "sesión cerrada".
 *
 * Uso: `catch (error) { return redirectForGuardError(error); }`
 */
export async function redirectForGuardError(error: unknown): Promise<never> {
  if (error instanceof UnauthorizedError) {
    redirect("/login");
  }
  if (error instanceof ForbiddenError) {
    // El ForbiddenError no trae el rol; requireActiveUser está memoizado con
    // cache() dentro del mismo request, así que esto no repite el read a Mongo.
    const { platformRole } = await requireActiveUser();
    redirect(platformRole === "EDITOR" ? "/admin?sinPermiso=1" : "/onboarding");
  }
  throw error;
}
