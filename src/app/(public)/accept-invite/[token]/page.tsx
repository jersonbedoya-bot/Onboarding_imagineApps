import { previewInvitation } from "@/server/services/invitation.service";
import { AcceptInviteForm } from "./AcceptInviteForm";
import { AuthShell } from "@/components/AuthShell";
import { LinkButton } from "@/components/Button";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let preview: Awaited<ReturnType<typeof previewInvitation>> | null = null;
  try {
    preview = await previewInvitation(token);
  } catch {
    preview = null;
  }

  if (!preview) {
    // Mismo AuthShell que el resto de pantallas públicas y con salida a login:
    // una invitación ya aceptada también cae acá, y esa persona solo necesita entrar.
    return (
      <AuthShell
        title="Esta invitación ya no sirve"
        description="El enlace no es válido, ya se usó o ya venció. Pídele a quien te invitó que te comparta uno nuevo."
      >
        {/* Etiqueta corta en el botón: LinkButton es whitespace-nowrap y la frase
            completa se salía del botón a 390px. */}
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm text-ink-soft">¿Ya activaste tu cuenta?</p>
          <LinkButton href="/login" variant="secondary" className="w-full">
            Iniciar sesión
          </LinkButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Activa tu cuenta"
      // Pedido explícito del usuario: la pantalla mostraba nombre+contraseña
      // sin aclarar dos cosas que no son obvias para quien recibe el link
      // por primera vez — (a) ese email (no un usuario aparte) es con lo
      // que va a iniciar sesión de ahora en más, y (b) la contraseña de acá
      // abajo es una NUEVA que él mismo elige, no una que ya tenga.
      description={`Te invitamos a ${preview.tenantName} como ${preview.roleLabel}. Iniciarás sesión con ${preview.email}; elige abajo la contraseña que usarás a partir de ahora.`}
    >
      <AcceptInviteForm token={token} />
    </AuthShell>
  );
}
