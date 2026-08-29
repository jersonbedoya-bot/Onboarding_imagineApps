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

  redirect(identity.platformRole === "ADMIN" ? "/admin/modules" : "/onboarding");
}
