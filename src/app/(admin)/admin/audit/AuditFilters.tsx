// Estructural, sin estilo definido. Es un form GET plano — no necesita
// Client Component: el navegador arma el query string y recarga la
// página del Server Component con los filtros aplicados.
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
    <form method="get" action="/admin/audit">
      <label htmlFor="userId">Usuario</label>
      <select id="userId" name="userId" defaultValue={selected.userId ?? ""}>
        <option value="">Todos</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.email}
          </option>
        ))}
      </select>

      <label htmlFor="action">Acción</label>
      <select id="action" name="action" defaultValue={selected.action ?? ""}>
        <option value="">Todas</option>
        {actions.map((action) => (
          <option key={action} value={action}>
            {action}
          </option>
        ))}
      </select>

      <label htmlFor="from">Desde</label>
      <input id="from" type="date" name="from" defaultValue={selected.from ?? ""} />

      <label htmlFor="to">Hasta</label>
      <input id="to" type="date" name="to" defaultValue={selected.to ?? ""} />

      <button type="submit">Filtrar</button>
    </form>
  );
}
