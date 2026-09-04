import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { listAuditLog } from "@/server/services/audit.service";
import { listUsers } from "@/server/services/user.service";
import { AUDIT_ACTIONS, type AuditAction } from "@/server/repositories/audit.repository";
import { ObjectId } from "mongodb";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { AUDIT_ACTION_LABELS, AUDIT_RESOURCE_LABELS } from "@/lib/audit-labels";
import { AuditFilters } from "./AuditFilters";
import { AuditDetails } from "./AuditDetails";

const PAGE_SIZE = 20;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; action?: string; from?: string; to?: string; page?: string }>;
}) {
  let identity;
  try {
    identity = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const params = await searchParams;
  const page = params.page ? Math.max(1, Number(params.page)) : 1;
  const userId = params.userId && ObjectId.isValid(params.userId) ? new ObjectId(params.userId) : undefined;
  const action = params.action && (AUDIT_ACTIONS as readonly string[]).includes(params.action) ? (params.action as AuditAction) : undefined;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  const [{ items, total }, { items: users }] = await Promise.all([
    listAuditLog(identity, { userId, action, from, to }, { page, pageSize: PAGE_SIZE }),
    listUsers(identity, { pageSize: 200 }),
  ]);

  const usersById = new Map(users.map((u) => [u._id.toString(), u.email]));
  const userOptions = users.map((u) => ({ id: u._id.toString(), email: u.email }));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Auditoría" description="Registro de acciones administrativas de tu tenant." />

      <AuditFilters
        users={userOptions}
        actions={AUDIT_ACTIONS as unknown as string[]}
        selected={{ userId: params.userId, action: params.action, from: params.from, to: params.to }}
      />

      <DataTable
        rows={items}
        rowKey={(item) => item._id.toString()}
        emptyMessage="No hay eventos de auditoría con estos filtros."
        columns={[
          {
            header: "Fecha",
            render: (item) => new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(item.timestamp),
          },
          { header: "Usuario", render: (item) => usersById.get(item.userId.toString()) ?? item.userId.toString() },
          { header: "Acción", render: (item) => AUDIT_ACTION_LABELS[item.action] ?? item.action },
          {
            header: "Recurso",
            render: (item) => {
              const kind = AUDIT_RESOURCE_LABELS[item.resource] ?? item.resource;
              return item.resourceLabel ? `${kind}: ${item.resourceLabel}` : `${kind} (…${item.resourceId.toString().slice(-6)})`;
            },
          },
          { header: "Detalles", render: (item) => <AuditDetails metadata={item.metadata} /> },
        ]}
      />

      <p className="mt-4 text-xs text-ink-soft">
        Página {page} de {totalPages} ({total} eventos)
      </p>
    </div>
  );
}
