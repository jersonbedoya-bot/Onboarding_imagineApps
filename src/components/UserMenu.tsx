"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";

/** Botón de cerrar sesión, compartido por el chrome de /admin y de /onboarding. */
export function UserMenu() {
  return (
    <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => signOut({ callbackUrl: "/login" })}>
      <Icon name="logout" size="sm" />
      Cerrar sesión
    </Button>
  );
}
