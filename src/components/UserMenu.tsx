"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/Button";

/** Botón de cerrar sesión, compartido por el chrome de /admin y de /onboarding. */
export function UserMenu() {
  return (
    <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => signOut({ callbackUrl: "/login" })}>
      Cerrar sesión
    </Button>
  );
}
