"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/Icon";
import type { PlatformRole } from "@/types/enums";

type NavItem = { href: string; label: string; icon: IconName; adminOnly?: boolean };
type NavGroup = { label: string; items: NavItem[] };

// Pedido explícito del usuario ("le hace falta más organización y
// jerarquía... que sea un panel realmente usable e intuitivo" para alguien
// sin nada de trasfondo técnico): antes esto era una fila plana de 7
// pestañas, todas al mismo nivel visual — nada distinguía "esto se usa a
// diario" de "esto es ocasional", ni agrupaba lo que conceptualmente va
// junto. Se reorganiza en 3 grupos con nombre propio (ver render más abajo,
// cada grupo es su columna con su caption arriba) + "Inicio" suelto como
// ancla, no como cuarto grupo — un dashboard no es un tema más, es el punto
// de partida.
const HOME_ITEM: NavItem = { href: "/admin", label: "Inicio", icon: "home" };

// adminOnly: EDITOR no gestiona usuarios/auditoría/mensajes de guía — ver
// requireContentEditor (session.ts), que tampoco deja pasar esas rutas.
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Personas",
    items: [{ href: "/admin/users", label: "Usuarios", icon: "users", adminOnly: true }],
  },
  {
    label: "Contenido del recorrido",
    items: [
      { href: "/admin/modules", label: "Módulos", icon: "grid" },
      { href: "/admin/leaders", label: "Líderes", icon: "crown" },
      { href: "/admin/messages", label: "Mensajes", icon: "message", adminOnly: true },
    ],
  },
  {
    label: "Revisar",
    items: [
      { href: "/admin/preview", label: "Vista previa", icon: "view" },
      { href: "/admin/quiz-answers", label: "Quiz", icon: "list", adminOnly: true },
      { href: "/admin/audit", label: "Auditoría", icon: "eye", adminOnly: true },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/admin") return pathname === "/admin"; // exacto: si no, "Inicio" quedaría resaltado en TODO /admin/*
  // Los pasos de un proceso viven en /admin/processes/[id], una página
  // aparte que se llega desde un módulo — sigue siendo parte de "Módulos"
  // para no dejar esa columna sin ninguna pestaña resaltada.
  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    (item.href === "/admin/modules" && pathname.startsWith("/admin/processes/"))
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-brand-tint text-brand-strong" : "text-ink-soft hover:bg-paper hover:text-ink",
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
}

export function AdminNav({ platformRole }: { platformRole: PlatformRole }) {
  const pathname = usePathname();
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || platformRole === "ADMIN"),
  })).filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Secciones de administración" className="flex items-end gap-5 overflow-x-auto">
      {/* "Inicio" sin caption arriba, a propósito: es el ancla, no un tema
          más — items-end en el <nav> lo deja igual de alineado abajo que
          las pestañas de cada grupo, que sí tienen su caption encima. */}
      <NavLink item={HOME_ITEM} active={isActive(pathname, HOME_ITEM)} />
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-ink-soft/70">{group.label}</span>
          <div className="flex gap-1">
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}
