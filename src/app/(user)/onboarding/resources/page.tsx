import { requireActiveUser } from "@/server/auth/session";
import { resolveJourney } from "@/server/services/progress.service";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { MarkdownContent } from "@/components/MarkdownContent";

/**
 * Recursos — biblioteca de consulta independiente del recorrido (Bloque 1
 * ya la modela como una etapa aparte, siempre desbloqueada y vacuously
 * completa: ver progress-derivation.ts). No usa OnboardingJourney: no hay
 * "paso a paso" que recorrer acá, solo contenido para volver cuando haga
 * falta. resolveJourney ya trae sus content_items resueltos (cache() lo
 * dedupea con la llamada del layout), así que no hace falta una consulta
 * nueva.
 */
export default async function OnboardingResourcesPage() {
  const identity = await requireActiveUser();
  const journey = await resolveJourney(identity);
  const recursos = journey.stages.find((stage) => stage.key === "recursos");

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10 lg:px-12">
      <header className="mb-10 text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-soft bg-brand-tint px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand">
          Recursos
        </span>
        <h1 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">Consulta libre</h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          No forma parte del recorrido obligatorio — volvé acá cuando lo necesites.
        </p>
      </header>

      {!recursos || recursos.items.length === 0 ? (
        <EmptyState title="Todavía no hay recursos publicados" description="Cuando tu organización los publique, los vas a ver acá." />
      ) : (
        <div className="flex flex-col gap-5">
          {recursos.items.map((item) => (
            <Card key={item.id}>
              <h2 className="mb-3 font-display text-lg font-semibold text-ink">{item.title}</h2>
              {item.body && <MarkdownContent>{item.body}</MarkdownContent>}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
