import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";

export type MarkdownContentProps = {
  children: string;
  className?: string;
};

/**
 * Renderiza texto Markdown (body de content items, objective/context/
 * expectedResult de procesos, description/instruction de pasos) con las
 * clases del design system, en vez de mostrar la sintaxis cruda.
 *
 * Deliberadamente sin `rehype-raw`: react-markdown no ejecuta HTML
 * embebido por defecto y no queremos reabrir esa puerta en contenido
 * editado desde el panel admin (mismo criterio que la allowlist de
 * src/lib/video-url.ts — nunca renderizar marcado crudo sin controlar).
 */
export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={cn("prose-onboarding text-sm text-ink-soft", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="mb-2 mt-4 font-display text-lg font-semibold text-ink first:mt-0">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-2 mt-4 font-display text-lg font-semibold text-ink first:mt-0">{children}</h3>,
          h3: ({ children }) => <h3 className="mb-2 mt-4 font-display text-base font-semibold text-ink first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-strong underline hover:no-underline">
              {children}
            </a>
          ),
          blockquote: ({ children }) => <blockquote className="mb-3 border-l-2 border-brand-soft pl-3 italic text-ink-soft last:mb-0">{children}</blockquote>,
          code: ({ children }) => <code className="rounded bg-brand-tint px-1 py-0.5 font-mono text-xs text-ink">{children}</code>,
          hr: () => <hr className="my-4 border-line" />,
          table: ({ children }) => (
            <div className="mb-3 overflow-x-auto last:mb-0">
              <table className="w-full border-collapse text-left">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b border-line px-2 py-1.5 font-semibold text-ink">{children}</th>,
          td: ({ children }) => <td className="border-b border-line px-2 py-1.5">{children}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
