import { redirect } from "next/navigation";
import { requireActiveUser } from "@/server/auth/session";

// "/" nunca es una pantalla en sí misma: solo decide a dónde mandar a
// cada quien. Es el destino post-login (ver login/page.tsx -> router.push("/")).
export default async function Home() {
  let identity;
  try {
    identity = await requireActiveUser();
  } catch {
    redirect("/login");
  }

  // ADMIN y EDITOR entran al panel; ninguno de los dos tiene functionalRoleId
  // (ver PLATFORM_ROLES), así que nunca deberían caer en /onboarding.
  // /admin (antes /admin/modules) es el dashboard de bienvenida — pedido
  // explícito del usuario, orienta a alguien sin trasfondo técnico en vez
  // de dejarlo caer directo en una lista de módulos sin contexto.
  redirect(identity.platformRole !== "USER" ? "/admin" : "/onboarding");
}
