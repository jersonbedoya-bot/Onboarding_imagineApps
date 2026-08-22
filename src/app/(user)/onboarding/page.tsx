import { redirect } from "next/navigation";
import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { CompleteStepButton } from "./CompleteStepButton";
import { MarkAsReadButton } from "./MarkAsReadButton";

// Estructural, sin estilo definido: el lineamiento de diseño visual
// todavía no existe.
export default async function OnboardingPage() {
  let identity;
  try {
    identity = await requireActiveUser();
  } catch {
    redirect("/login");
  }

  const journey = await resolveJourney(identity);

  if (journey.stages.length === 0) {
    return (
      <main>
        <h1>Tu onboarding</h1>
        <p>Todavía no hay una ruta de onboarding publicada para vos.</p>
      </main>
    );
  }

  if (journey.currentStageId === null) {
    return (
      <main>
        <h1>Tu onboarding</h1>
        <p>¡Completaste todo tu recorrido de onboarding!</p>
        <StageList journey={journey} />
      </main>
    );
  }

  return (
    <main>
      <h1>Tu onboarding</h1>
      <p>Estado general: {journey.routeStatus}</p>
      <StageList journey={journey} />
    </main>
  );
}

function StageList({ journey }: { journey: Awaited<ReturnType<typeof resolveJourney>> }) {
  return (
    <ol>
      {journey.stages.map((stage) => (
        <li key={stage.id}>
          <h2>
            {stage.title} — {stage.status}
            {stage.id === journey.currentStageId ? " (etapa actual)" : ""}
            {!stage.unlocked ? " (bloqueada)" : ""}
          </h2>

          {/* Matiz de presentación: readOnly = etapa de solo lectura/consulta
              (nada completable ahí), no una etapa vacía ni un "0/0". */}
          {stage.readOnly ? (
            <p>Contenido de consulta — no requiere acciones.</p>
          ) : (
            <p>
              Progreso: {stage.completedCount}/{stage.totalCompletable}
            </p>
          )}

          {!stage.unlocked ? null : (
            <>
              <ul>
                {stage.items.map((item) => (
                  <li key={item.id}>
                    {item.title} ({item.type})
                    {item.requirement === "OBLIGATORY" && (
                      <MarkAsReadButton contentItemId={item.id} completed={item.completed} />
                    )}
                  </li>
                ))}
              </ul>

              {stage.processes.map((process) => (
                <div key={process.id}>
                  <h3>{process.title}</h3>
                  <p>{process.objective}</p>
                  <ul>
                    {process.steps.map((step) => (
                      <li key={step.id}>
                        {step.title} <CompleteStepButton stepId={step.id} completed={step.completed} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
