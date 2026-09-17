import { Card } from "@/components/Card";
import { Select } from "@/components/Field";
import { Button } from "@/components/Button";

// Form GET plano — mismo patrón que /admin/audit/AuditFilters: el
// navegador arma el query string y recarga esta página (Server Component).
export function QuizAnswersFilters({
  users,
  quizzes,
  selected,
}: {
  users: { id: string; email: string }[];
  quizzes: { id: string; title: string }[];
  selected: { userId?: string; contentItemId?: string };
}) {
  return (
    <Card as="form" method="get" action="/admin/quiz-answers" className="mb-6">
      <div className="flex flex-wrap items-end gap-4">
        <Select id="userId" name="userId" label="Usuario" defaultValue={selected.userId ?? ""} className="w-auto">
          <option value="">Todos</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </Select>

        <Select id="contentItemId" name="contentItemId" label="Quiz" defaultValue={selected.contentItemId ?? ""} className="w-auto">
          <option value="">Todos</option>
          {quizzes.map((quiz) => (
            <option key={quiz.id} value={quiz.id}>
              {quiz.title}
            </option>
          ))}
        </Select>

        <Button type="submit" className="px-5 py-2 text-sm">
          Filtrar
        </Button>
      </div>
    </Card>
  );
}
