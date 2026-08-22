import { previewInvitation } from "@/server/services/invitation.service";
import { AcceptInviteForm } from "./AcceptInviteForm";

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe.
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
      <main>
        <h1>Invitación inválida</h1>
        <p>Este link no es válido o ya expiró. Pedile a quien te invitó que te comparta uno nuevo.</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Activá tu cuenta</h1>
      <p>
        Te invitaron a {preview.tenantName} como {preview.roleLabel} ({preview.email}).
      </p>
      <AcceptInviteForm token={token} />
    </main>
  );
}
