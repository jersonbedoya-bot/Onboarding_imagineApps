import { sectorIcon, type ImpactProject } from "@/lib/institutional-content";

/** Grilla de cards para los proyectos de alto impacto de Fase 01 (ver institutional-content.ts). */
export function ImpactProjectsGrid({ projects }: { projects: ImpactProject[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:[grid-template-columns:repeat(auto-fit,minmax(260px,340px))] sm:justify-center">
      {projects.map((project, i) => (
        <div key={i} className="rounded-lg border border-line bg-card p-4 shadow-sm xl:p-5">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <span className="flex items-center gap-2">
              <span aria-hidden className="text-xl leading-none">
                {sectorIcon(project.sector)}
              </span>
              <h4 className="font-display text-base font-semibold text-ink xl:text-lg">{project.client}</h4>
            </span>
            <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand-strong">{project.sector}</span>
          </div>
          <p className="text-sm leading-relaxed text-ink-soft">{project.description}</p>
        </div>
      ))}
    </div>
  );
}
