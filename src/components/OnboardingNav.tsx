"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ONBOARDING_NAV_ITEMS = [
  { href: "/onboarding", label: "Mi recorrido" },
  { href: "/onboarding/leaders", label: "Nuestro equipo" },
  { href: "/onboarding/resources", label: "Recursos" },
];

export function OnboardingNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del onboarding" className="flex gap-1">
      {ONBOARDING_NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
              active ? "bg-brand-tint text-brand-strong" : "text-ink-soft hover:bg-brand-tint hover:text-brand-strong",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
