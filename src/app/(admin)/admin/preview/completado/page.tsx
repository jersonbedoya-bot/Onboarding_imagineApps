import { redirect } from "next/navigation";
import { requireContentEditor } from "@/server/auth/session";
import { PageHeader } from "@/components/admin/PageHeader";
import { LinkButton } from "@/components/Button";
import { OnboardingCompletion } from "@/components/OnboardingCompletion";

/**
 * Pantalla final del onboarding vista desde el panel. La real
 * (onboarding/completado) vive bajo el layout de (user)/onboarding, que manda
 * a /admin a cualquiera sin rol funcional — Admin/Editor nunca lo tienen, así
 * que no podían verla. Mismo componente, sin exigir progreso real.
 */
export default async function AdminPreviewCompletadoPage() {
  try {
    await requireContentEditor();
  } catch {
    redirect("/login");
  }

  return (
    <div>
      <PageHeader
        title="Vista previa · Pantalla final"
        description="Esto es lo que ve un Imaginer justo al terminar su último módulo. Es igual para todos los roles."
        action={
          <LinkButton href="/admin/preview" variant="secondary" className="px-3 py-1.5 text-xs">
            Volver a la vista previa
          </LinkButton>
        }
      />
      <OnboardingCompletion exitHref="/admin/preview" exitLabel="Ver todo el contenido" />
    </div>
  );
}
