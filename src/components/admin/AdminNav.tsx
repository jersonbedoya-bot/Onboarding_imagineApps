"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/Icon";

type NavItem = { href: string; label: string; icon: IconName };

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin/modules", label: "Módulos", icon: "grid" },
  { href: "/admin/messages", label: "Mensajes", icon: "message" },
  { href: "/admin/leaders", label: "Líderes", icon: "crown" },
  { href: "/admin/users", label: "Usuarios", icon: "users" },
  { href: "/admin/audit", label: "Auditoría", icon: "eye" },
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
            aria-current={active ? "page" : undefined}
            className={cn(
              "group inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-brand-tint text-brand-strong"
                : "text-ink-soft hover:bg-paper hover:text-ink",
            )}
          >
            <Icon
              name={item.icon}
              size="sm"
              className={cn("transition-colors", active ? "text-brand-strong" : "text-ink-soft group-hover:text-ink")}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
