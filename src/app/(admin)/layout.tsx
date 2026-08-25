import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { UserMenu } from "@/components/UserMenu";

// Chrome compartido por TODO /admin — evita repetir el contenedor, la
// franja superior y la nav en cada page.tsx.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3">
          <span className="flex-shrink-0 font-display text-base font-bold text-ink">
            imagine<span className="text-brand">.</span>
          </span>
          <span className="flex-shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
            Admin
          </span>
          <div className="flex-1" />
          <UserMenu />
        </div>
        <div className="mx-auto max-w-5xl px-6 pb-2">
          <AdminNav />
        </div>
      </div>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
