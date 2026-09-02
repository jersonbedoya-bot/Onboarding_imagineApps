import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";

export type MarkdownContentProps = {
  children: string;
  className?: string;
};

// Identidad estable del componente de enlace: permite detectar, desde `p`,
// cuando un párrafo contiene ÚNICAMENTE un link (ver isSoleLink) para
// tratarlo como botón de acción ("Enlace a herramienta real") en vez de
// texto subrayado suelto — sin eso, react-markdown v9+ ya no expone el
// nodo AST original en los componentes, así que la comparación tiene que
// ser por referencia del propio componente renderizado.
type AnchorProps = { href?: string; className?: string; children?: ReactNode };

function Anchor({ href, className, children }: AnchorProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className ?? "font-medium text-brand-strong underline hover:no-underline"}>
      {children}
    </a>
  );
}

function isSoleLink(children: ReactNode): ReactElement<AnchorProps> | null {
  const arr = Children.toArray(children).filter((child) => !(typeof child === "string" && child.trim() === ""));
  const only = arr[0];
  if (arr.length === 1 && isValidElement<AnchorProps>(only) && only.type === Anchor) return only;
  return null;
}

/**
 * Renderiza texto Markdown (body de content items, objective/context/
 * expectedResult de procesos, description/instruction de pasos) con las
 * clases del design system, en vez de mostrar la sintaxis cruda.
 *
 * 4 formas reciben tratamiento visual "accionable" en vez de texto plano
 * (ver botones de inserción en MarkdownTextarea.tsx, que arman cada una
 * de estas con el mismo Markdown estándar que ReactMarkdown ya entendía):
 *   - Checklist (`- [ ] paso`): ítems con casillero propio, no bullet.
 *   - Dato clave (blockquote `>`): callout destacado con ícono, no cita.
 *   - Enlace a herramienta (un link solo en su párrafo): botón, no texto
 *     subrayado suelto — un link normal DENTRO de una oración se sigue
 *     viendo como link.
 *   - Tabla: ya la traía remark-gfm, se le agrega borde/fondo de tarjeta.
 *
 * Deliberadamente sin `rehype-raw`: react-markdown no ejecuta HTML
 * embebido por defecto y no queremos reabrir esa puerta en contenido
 * editado desde el panel admin (mismo criterio que la allowlist de
 * src/lib/video-url.ts — nunca renderizar marcado crudo sin controlar).
 */
export function MarkdownContent({ children, className }: MarkdownContentProps) {
  const components: Components = {
    h1: ({ children }) => <h3 className="mb-2 mt-4 font-display text-lg font-semibold text-ink first:mt-0">{children}</h3>,
    h2: ({ children }) => <h3 className="mb-2 mt-4 font-display text-lg font-semibold text-ink first:mt-0">{children}</h3>,
    h3: ({ children }) => <h3 className="mb-2 mt-4 font-display text-base font-semibold text-ink first:mt-0">{children}</h3>,
    p: ({ children }) => {
      const soleLink = isSoleLink(children);
      if (soleLink) {
        return (
          <p className="mb-3 last:mb-0">
            {cloneElement(soleLink, {
              className: "inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-brand-strong",
              children: <>🔗 {soleLink.props.children}</>,
            })}
          </p>
        );
      }
      return <p className="mb-3 leading-relaxed last:mb-0">{children}</p>;
    },
    strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>,
    ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
    li: ({ children, className }) => {
      // mdast-util-to-hast marca los <li> de una checklist (`- [ ]`) con
      // className="task-list-item" y mete el <input type=checkbox> como
      // primer hijo — no hay un prop `checked` propio en el <li>. Acá solo
      // se ajusta el layout (sin bullet, checkbox alineado con texto que
      // puede envolver a 2 líneas); el checkbox en sí lo reemplaza `input`.
      const isTask = typeof className === "string" && className.includes("task-list-item");
      return <li className={cn("leading-relaxed", isTask && "-ml-5 flex list-none items-start gap-2")}>{children}</li>;
    },
    // El único <input> que puede aparecer en este Markdown es el checkbox
    // de una checklist (no hay rehype-raw, así que HTML crudo nunca llega
    // hasta acá) — se reemplaza por un casillero propio del design system
    // en vez del checkbox nativo del navegador.
    input: ({ checked }) => (
      <span
        className={cn(
          "mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded border align-text-bottom",
          checked ? "border-success bg-success text-white" : "border-line",
        )}
        aria-hidden="true"
      >
        {checked && (
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    ),
    a: Anchor,
    blockquote: ({ children }) => (
      <blockquote className="mb-3 flex gap-2 rounded-md border border-brand-soft bg-brand-tint/40 px-3 py-2 text-ink last:mb-0" aria-label="Dato clave">
        <span aria-hidden="true">🔑</span>
        <div className="[&_p]:mb-0">{children}</div>
      </blockquote>
    ),
    code: ({ children }) => <code className="rounded bg-brand-tint px-1 py-0.5 font-mono text-xs text-ink">{children}</code>,
    hr: () => <hr className="my-4 border-line" />,
    img: ({ src, alt }) =>
      typeof src === "string" ? (
        // eslint-disable-next-line @next/next/no-img-element -- fuente arbitraria (Vercel Blob), no un asset propio optimizable con next/image
        <img src={src} alt={alt ?? ""} className="my-3 max-h-[28rem] w-full rounded-md border border-line object-contain" />
      ) : null,
    table: ({ children }) => (
      <div className="mb-3 overflow-x-auto rounded-md border border-line last:mb-0">
        <table className="w-full border-collapse text-left">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="border-b border-line bg-brand-tint/40 px-2 py-1.5 font-semibold text-ink">{children}</th>,
    td: ({ children }) => <td className="border-b border-line px-2 py-1.5">{children}</td>,
  };

  return (
    <div className={cn("prose-onboarding text-sm text-ink-soft", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
