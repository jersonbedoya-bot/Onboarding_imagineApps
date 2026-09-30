import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/server/auth/session";
import { listQuizAnswers } from "@/server/services/quiz-answer.service";
import { listQuizItems } from "@/server/services/content.service";
import { listUsers } from "@/server/services/user.service";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { QuizAnswersFilters } from "./QuizAnswersFilters";

const PAGE_SIZE = 20;

/**
 * Control de respuestas del quiz — pedido explícito del usuario (el quiz
 * nació "puramente lúdico, sin evaluación real ni persistencia", ver
 * BACKLOG.md; esto agrega la parte de persistencia+visibilidad sin
 * convertirlo en una evaluación real: solo lista qué respondió cada
 * quien, no califica ni afecta el progreso de nadie).
 */
export default async function AdminQuizAnswersPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; contentItemId?: string; page?: string }>;
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
  const contentItemId = params.contentItemId && ObjectId.isValid(params.contentItemId) ? new ObjectId(params.contentItemId) : undefined;

  const [{ items, total }, quizzes, { items: users }] = await Promise.all([
    listQuizAnswers(identity, { userId, contentItemId }, { page, pageSize: PAGE_SIZE }),
    listQuizItems(identity),
    listUsers(identity, { pageSize: 200 }),
  ]);

  const usersById = new Map(users.map((u) => [u._id.toString(), u.email]));
  const quizzesById = new Map(quizzes.map((q) => [q._id.toString(), q.title]));
  const quizOptions = quizzes.map((q) => ({ id: q._id.toString(), title: q.title }));
  const userOptions = users.map((u) => ({ id: u._id.toString(), email: u.email }));
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Respuestas de quiz"
        description="Qué respondió cada persona en los quizzes del onboarding — solo consulta, no califica ni afecta su progreso."
      />

      <QuizAnswersFilters
        users={userOptions}
        quizzes={quizOptions}
        selected={{ userId: params.userId, contentItemId: params.contentItemId }}
      />

      <DataTable
        rows={items}
        rowKey={(item) => item.id}
        emptyMessage="Todavía no hay respuestas de quiz con estos filtros."
        columns={[
          {
            header: "Fecha",
            render: (item) => new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short" }).format(item.answeredAt),
          },
          { header: "Usuario", render: (item) => usersById.get(item.userId) ?? item.userId },
          { header: "Quiz", render: (item) => quizzesById.get(item.contentItemId) ?? "—" },
          { header: "Pregunta", render: (item) => item.questionText },
          { header: "Respuesta", render: (item) => item.selectedOption },
        ]}
      />

      <Pagination
        basePath="/admin/quiz-answers"
        page={page}
        totalPages={totalPages}
        total={total}
        itemLabel="respuestas"
        searchParams={{ userId: params.userId, contentItemId: params.contentItemId }}
      />
    </div>
  );
}
