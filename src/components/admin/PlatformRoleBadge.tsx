import { Badge } from "@/components/Badge";
import { Icon } from "@/components/Icon";
import type { PlatformRole } from "@/types/enums";

/**
 * Distinción visual notoria del nivel de acceso — el usuario señaló que
 * antes esto era ambiguo (un `<select>` de rol funcional en la misma fila
 * que todo lo demás, sin ningún indicador de quién es admin). Imaginer
 * (USER) no lleva badge: es el nivel por default, no hace falta remarcarlo.
 */
const CONFIG: Record<"EDITOR" | "ADMIN", { label: string; icon: "edit" | "crown" }> = {
  ADMIN: { label: "Admin", icon: "crown" },
  EDITOR: { label: "Editor", icon: "edit" },
};

export function PlatformRoleBadge({ role }: { role: PlatformRole }) {
  if (role === "USER") return null;
  const { label, icon } = CONFIG[role];
  return (
    <Badge variant={role === "ADMIN" ? "brand" : "success"}>
      <Icon name={icon} size="sm" />
      {label}
    </Badge>
  );
}
