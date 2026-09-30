/**
 * Bienvenida grande de /onboarding (título + subtítulo editables desde
 * /admin/messages). Compartida con /admin/preview: antes solo vivía en
 * (user)/onboarding/page.tsx, así que "Ver en la vista previa" desde
 * Mensajes de guía llevaba a una pantalla donde el texto recién editado no
 * aparecía por ningún lado.
 */
export function RouteHeader({
  headline,
  subtitle,
  headingLevel = "h1",
}: {
  headline: string;
  subtitle: string;
  /** "h2" en /admin/preview, donde el <h1> ya es el título de la página del panel. */
  headingLevel?: "h1" | "h2";
}) {
  const Heading = headingLevel;
  return (
    <header className="mb-10 rounded-2xl border border-brand-soft bg-gradient-to-br from-brand-tint to-card px-8 py-10 sm:px-12 xl:py-14">
      <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-card px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-brand-strong">
        Tu recorrido
      </span>
      <Heading className="text-gradient-brand font-display text-4xl font-semibold leading-tight sm:text-5xl xl:text-6xl">{headline}</Heading>
      {subtitle && <p className="mt-3 max-w-xl text-base text-ink-soft xl:text-lg">{subtitle}</p>}
    </header>
  );
}
