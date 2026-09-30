import { previewPasswordReset } from "@/server/services/password-reset.service";
import { AuthShell } from "@/components/AuthShell";
import Link from "next/link";
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
    // Mismo AuthShell que el resto de pantallas públicas y con salida a login:
    // antes era un EmptyState suelto y quien ya había cambiado su contraseña
    // (enlace "usado") no tenía cómo volver a entrar desde acá.
    return (
      <AuthShell
        title="Este enlace ya no sirve"
        description="Puede que haya vencido (dura 24 horas) o que ya se haya usado. Pide uno nuevo y un administrador te lo compartirá."
      >
        <div className="flex flex-col gap-4">
          <LinkButton href="/forgot-password" variant="primary" className="w-full">
            Pedir un enlace nuevo
          </LinkButton>
          <Link href="/login" className="text-center text-sm text-ink-soft hover:text-brand-strong">
            Si ya elegiste tu contraseña, inicia sesión
          </Link>
        </div>
      </AuthShell>
    );
  }

  const firstName = preview.name.trim().split(" ")[0] || preview.name;
  return <ResetPasswordForm token={token} firstName={firstName} email={preview.email} />;
}
