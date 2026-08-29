"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/modules", label: "Módulos" },
  { href: "/admin/leaders", label: "Líderes" },
  { href: "/admin/users", label: "Usuarios" },
  { href: "/admin/audit", label: "Auditoría" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de administración" className="flex gap-1 overflow-x-auto">
      {ADMIN_NAV_ITEMS.map((item) => {
        // Los pasos de un proceso viven en /admin/processes/[id], una página
        // aparte que se llega desde un módulo — sigue siendo parte de
        // "Módulos" para no dejar la nav sin ninguna pestaña resaltada.
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.href === "/admin/modules" && pathname.startsWith("/admin/processes/"));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-brand-tint text-brand-strong" : "text-ink-soft hover:bg-paper hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
