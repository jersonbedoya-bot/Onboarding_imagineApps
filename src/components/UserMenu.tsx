"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";

/**
 * Botón de cerrar sesión, compartido por el chrome de /admin y de /onboarding.
 *
 * `compactOnMobile`: debajo de sm deja solo el ícono (con aria-label, así el
 * nombre accesible sigue siendo "Cerrar sesión"). Lo pide el topbar de
 * /onboarding, donde logo + "Nuestro equipo" + este botón no entraban en
 * 390px y el texto se cortaba ("Cerrar se…"). Opt-in para no cambiar el
 * chrome de /admin ni las pantallas vacías, que sí tienen espacio.
 */
export function UserMenu({ compactOnMobile = false }: { compactOnMobile?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn("py-1.5 text-xs", compactOnMobile ? "px-2 sm:px-3" : "px-3")}
      aria-label={compactOnMobile ? "Cerrar sesión" : undefined}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      <Icon name="logout" size="sm" />
      <span className={cn(compactOnMobile && "hidden sm:inline")}>Cerrar sesión</span>
    </Button>
  );
}
