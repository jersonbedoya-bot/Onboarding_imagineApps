"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/Icon";
import type { PlatformRole } from "@/types/enums";

type NavItem = { href: string; label: string; icon: IconName; adminOnly?: boolean };
type GroupTone = "people" | "content" | "review";
// shortLabel: el título que se ve en celular, donde "Contenido del
// recorrido" ocupa media pantalla en una fila que ya scrollea.
type NavGroup = { label: string; shortLabel?: string; tone: GroupTone; items: NavItem[] };

// Clases literales (no armadas con `group-${tone}`) para que Tailwind las
// detecte al compilar. El tono solo marca el punto del título, el icono de
// las pestañas inactivas y la línea superior de la bandeja: el naranja
// sigue siendo exclusivo de la pestaña activa.
const TONE_CLASSES: Record<GroupTone, { dot: string; icon: string; line: string }> = {
  people: { dot: "bg-group-people", icon: "text-group-people", line: "bg-group-people/60" },
  content: { dot: "bg-group-content", icon: "text-group-content", line: "bg-group-content/60" },
  review: { dot: "bg-group-review", icon: "text-group-review", line: "bg-group-review/60" },
};

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
    tone: "people",
    items: [
      { href: "/admin/users", label: "Usuarios", icon: "users", adminOnly: true },
      { href: "/admin/roles", label: "Roles", icon: "tag", adminOnly: true },
    ],
  },
  {
    label: "Contenido del recorrido",
    shortLabel: "Contenido",
    tone: "content",
    items: [
      { href: "/admin/modules", label: "Módulos", icon: "grid" },
      { href: "/admin/leaders", label: "Líderes", icon: "crown" },
      { href: "/admin/messages", label: "Mensajes", icon: "message", adminOnly: true },
    ],
  },
  {
    label: "Revisar",
    tone: "review",
    items: [
      { href: "/admin/preview", label: "Vista previa", icon: "view" },
      { href: "/admin/quiz-answers", label: "Quiz", icon: "list", adminOnly: true },
      { href: "/admin/audit", label: "Auditoría", icon: "history", adminOnly: true },
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

function NavLink({ item, active, iconTone }: { item: NavItem; active: boolean; iconTone?: string }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      // Mismo lenguaje que el menú de imagineapps.co: texto blanco, el
      // activo en naranja con una línea debajo (no una píldora de fondo).
      className={cn(
        "group inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "border-brand-strong text-brand-strong" : "border-transparent text-ink hover:text-brand-strong",
      )}
    >
      <Icon
        name={item.icon}
        size="sm"
        className={cn(
          "transition-colors",
          active ? "text-brand-strong" : cn(iconTone ?? "text-ink-soft", "group-hover:text-brand-strong"),
        )}
      />
      {item.label}
    </Link>
  );
}

export function AdminNav({ platformRole }: { platformRole: PlatformRole }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.adminOnly || platformRole === "ADMIN"),
  })).filter((group) => group.items.length > 0);

  // En celular la fila scrollea y la pestaña activa podía quedar fuera de
  // vista (p. ej. Auditoría, la última): se centra al cambiar de página.
  // Solo si de verdad hay desborde, para no mover nada en escritorio.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || nav.scrollWidth <= nav.clientWidth) return;
    nav.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <div className="relative">
      <nav
        ref={navRef}
        aria-label="Secciones de administración"
        className="scrollbar-none flex items-end gap-4 overflow-x-auto pr-8 sm:pr-0"
      >
        {/* "Inicio" suelto, fuera de las bandejas, a propósito: es el ancla,
            no un tema más — items-end en el <nav> lo deja alineado abajo con
            las pestañas de cada grupo, que sí tienen su título encima. */}
        <div className="pb-1.5">
          <NavLink item={HOME_ITEM} active={isActive(pathname, HOME_ITEM)} />
        </div>
        {groups.map((group) => {
          const tone = TONE_CLASSES[group.tone];
          const containsActive = group.items.some((item) => isActive(pathname, item));
          return (
            // Bandeja sutil por grupo: separa visualmente cada tema sin
            // competir con el contenido de la página.
            <div
              key={group.label}
              className="relative flex flex-shrink-0 flex-col gap-1 overflow-hidden rounded-2xl border border-line bg-white/[0.03] px-1.5 pb-1.5 pt-2"
            >
              <span aria-hidden className={cn("absolute inset-x-4 top-0 h-0.5 rounded-full", tone.line)} />
              <span
                className={cn(
                  "flex items-center gap-1.5 px-3 text-[11px] font-bold uppercase tracking-widest",
                  containsActive ? "text-ink" : "text-ink-soft",
                )}
              >
                <span aria-hidden className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", tone.dot)} />
                {group.shortLabel ? (
                  <>
                    <span className="sm:hidden">{group.shortLabel}</span>
                    <span className="hidden sm:inline">{group.label}</span>
                  </>
                ) : (
                  group.label
                )}
              </span>
              <div className="flex gap-1">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(pathname, item)} iconTone={tone.icon} />
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      {/* Pista de "hay más a la derecha" en celular, en lugar de la barra
          de scroll nativa (oculta con scrollbar-none). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-paper to-transparent sm:hidden"
      />
    </div>
  );
}
