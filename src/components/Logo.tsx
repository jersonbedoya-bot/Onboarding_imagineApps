import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * Isotipo + wordmark de Imagine Apps — reemplaza el wordmark de texto plano
 * ("imagine.") usado antes en AuthShell/AdminLayout/OnboardingTopbar.
 * Ícono extraído del sitio oficial (imagineapps.co), servido localmente
 * desde /public/logo.png en vez de referenciar el dominio externo.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-bold text-ink", className)}>
      <Image src="/logo.png" alt="" width={28} height={24} className="h-6 w-[28px] shrink-0 object-contain" priority />
      Imagine Apps
    </span>
  );
}
