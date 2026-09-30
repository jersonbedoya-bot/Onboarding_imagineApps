import { previewInvitation } from "@/server/services/invitation.service";
import { AcceptInviteForm } from "./AcceptInviteForm";
import { AuthShell } from "@/components/AuthShell";
import { EmptyState } from "@/components/EmptyState";

export default async function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let preview: Awaited<ReturnType<typeof previewInvitation>> | null = null;
  try {
    preview = await previewInvitation(token);
  } catch {
    preview = null;
  }

  if (!preview) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <EmptyState
          title="Invitación inválida"
          description="Este link no es válido o ya expiró. Pídele a quien te invitó que te comparta uno nuevo."
        />
      </main>
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
