import { Card } from "@/components/Card";
import { Select, Input } from "@/components/Field";
import { Button } from "@/components/Button";
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_GROUP_LABELS } from "@/lib/audit-labels";
import type { AuditAction } from "@/server/repositories/audit.repository";

function groupActions(actions: string[]): { group: string; actions: string[] }[] {
  const order: string[] = [];
  const byGroup = new Map<string, string[]>();
  for (const action of actions) {
    const prefix = action.split("_")[0];
    const group = AUDIT_ACTION_GROUP_LABELS[prefix] ?? prefix;
    if (!byGroup.has(group)) {
      byGroup.set(group, []);
      order.push(group);
    }
    byGroup.get(group)!.push(action);
  }
  return order.map((group) => ({ group, actions: byGroup.get(group)! }));
}

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
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Select id="userId" name="userId" label="Usuario" defaultValue={selected.userId ?? ""}>
          <option value="">Todos</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </Select>

        <Select id="action" name="action" label="Acción" defaultValue={selected.action ?? ""}>
          <option value="">Todas</option>
          {groupActions(actions).map(({ group, actions: groupedActions }) => (
            <optgroup key={group} label={group}>
              {groupedActions.map((action) => (
                <option key={action} value={action}>
                  {AUDIT_ACTION_LABELS[action as AuditAction] ?? action}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>

        <Input id="from" label="Desde" type="date" name="from" defaultValue={selected.from ?? ""} />
        <Input id="to" label="Hasta" type="date" name="to" defaultValue={selected.to ?? ""} />

        <Button type="submit" className="px-5 py-2 text-sm">
          Filtrar
        </Button>
      </div>
    </Card>
  );
}
