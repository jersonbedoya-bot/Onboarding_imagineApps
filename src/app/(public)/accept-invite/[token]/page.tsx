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
      title="Activá tu cuenta"
      description={`Te invitaron a ${preview.tenantName} como ${preview.roleLabel} (${preview.email}).`}
    >
      <AcceptInviteForm token={token} />
    </AuthShell>
  );
}
