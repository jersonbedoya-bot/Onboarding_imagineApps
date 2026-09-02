import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";

export type AuthShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/** Shell centrado compartido por login y accept-invite: wordmark + card. */
export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo className="text-xl" />
        </div>
        <div className="rounded-xl border border-line bg-card p-8 shadow-lg">
          <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
          {description && <p className="mt-2 text-sm text-ink-soft">{description}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
