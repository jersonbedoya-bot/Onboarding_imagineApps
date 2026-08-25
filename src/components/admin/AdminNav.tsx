"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/routes", label: "Rutas" },
  { href: "/admin/content", label: "Contenido" },
  { href: "/admin/leaders", label: "Líderes" },
  { href: "/admin/processes", label: "Procesos" },
  { href: "/admin/users", label: "Usuarios" },
  { href: "/admin/audit", label: "Auditoría" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de administración" className="flex gap-1 overflow-x-auto">
      {ADMIN_NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
