import { previewPasswordReset } from "@/server/services/password-reset.service";
import { AuthShell } from "@/components/AuthShell";
import { EmptyState } from "@/components/EmptyState";
import { LinkButton } from "@/components/Button";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let preview: Awaited<ReturnType<typeof previewPasswordReset>> | null = null;
  try {
    preview = await previewPasswordReset(token);
  } catch {
    preview = null;
  }

  if (!preview) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
        <EmptyState
          title="Este enlace ya no sirve"
          description="Puede que haya vencido (dura 24 horas) o que ya se haya usado. Pide uno nuevo y un administrador te lo compartirá."
        />
        <LinkButton href="/forgot-password">Pedir un enlace nuevo</LinkButton>
      </main>
    );
  }

  const firstName = preview.name.trim().split(" ")[0] || preview.name;
  return (
    <AuthShell title="Elige una nueva contraseña" description={`Hola, ${firstName}. Vas a cambiar la contraseña de ${preview.email}.`}>
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
