"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Detección pasiva de "visto" por scroll para contenido NO obligatorio.
 * A diferencia de MarkAsReadButton, no hay acción del usuario: cuando el
 * bloque queda sustancialmente visible en pantalla se dispara sola una
 * vez y se desconecta. `enabled` en false (contenido OBLIGATORY, que ya
 * tiene su propio flujo de acuse de lectura) hace que esto sea un simple
 * wrapper sin efecto.
 */
export function ContentViewTracker({
  contentItemId,
  initialViewed,
  enabled,
  children,
}: {
  contentItemId: string;
  initialViewed: boolean;
  enabled: boolean;
  children: ReactNode;
}) {
  const [viewed, setViewed] = useState(initialViewed);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || viewed) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        fetch(`/api/progress/content/${contentItemId}/view`, { method: "POST" })
          .then((response) => response.json())
          .then((body) => {
            if (body?.success) setViewed(true);
          })
          .catch(() => {});
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, viewed, contentItemId]);

  return (
    <div ref={ref} className="flex flex-col gap-2">
      {children}
      {enabled && viewed && (
        <span className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-ink-soft">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Visto
        </span>
      )}
    </div>
  );
}
