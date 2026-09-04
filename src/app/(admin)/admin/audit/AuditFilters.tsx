import { Card } from "@/components/Card";
import { Select, Input } from "@/components/Field";
import { Button } from "@/components/Button";
import { AUDIT_ACTION_LABELS } from "@/lib/audit-labels";
import type { AuditAction } from "@/server/repositories/audit.repository";

// Form GET plano — no necesita Client Component: el navegador arma el
// query string y recarga la página del Server Component con los filtros.
export function AuditFilters({
  users,
  actions,
  selected,
}: {
  users: { id: string; email: string }[];
  actions: string[];
  selected: { userId?: string; action?: string; from?: string; to?: string };
}) {
  return (
    <Card as="form" method="get" action="/admin/audit" className="mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <Select id="userId" name="userId" label="Usuario" defaultValue={selected.userId ?? ""} className="w-auto">
          <option value="">Todos</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </Select>

        <Select id="action" name="action" label="Acción" defaultValue={selected.action ?? ""} className="w-auto">
          <option value="">Todas</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {AUDIT_ACTION_LABELS[action as AuditAction] ?? action}
            </option>
          ))}
        </Select>

        <Input id="from" label="Desde" type="date" name="from" defaultValue={selected.from ?? ""} className="w-auto" />
        <Input id="to" label="Hasta" type="date" name="to" defaultValue={selected.to ?? ""} className="w-auto" />

        <Button type="submit" className="px-5 py-2 text-sm">
          Filtrar
        </Button>
      </div>
    </Card>
  );
}
