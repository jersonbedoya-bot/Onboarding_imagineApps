# Backlog

Features y mejoras explícitamente diferidas — decisión del Product Owner, no deuda técnica olvidada. No implementar sin aprobación explícita, ya que cada una es un cambio de alcance funcional (PRD §59).

## Fase visual (Fase 6) — diferidas al aprobar el lineamiento de diseño

- **Formulario "conocé al equipo"**: la referencia visual permitía que el usuario llenara notas por cada líder (años en la empresa, proyectos, tips) además de marcarlo como conocido. Requeriría una colección nueva de respuestas por usuario+líder. El check de "conocido/visto" que ya soporta el modelo actual (basado en el mismo mecanismo de `user_progress`/visibilidad) alcanza por ahora — sin el formulario de notas.
- **Quiz "completar la frase"**: el quiz actual (`QuizBlock.tsx`) solo soporta opción múltiple; la variante de completar espacios en blanco de la maqueta de referencia no está implementada.

## Fase 2 — administración de usuarios

- **Revocar/reenviar invitación**: hoy una invitación pendiente solo puede expirar sola (7 días) o consumirse; no hay acción admin para revocarla antes ni para reenviar un nuevo link si el original se perdió.

## Fase 3B — media

- **Client-direct-upload a Vercel Blob**: hoy la subida de imágenes pasa por proxy server-side simple (`src/server/media/provider.ts`), con el límite de ~4MB de las funciones serverless documentado como riesgo conocido. El patrón de subida directa cliente→Blob (sin pasar por el servidor) quedó fuera del MVP.
- **`BLOB_READ_WRITE_TOKEN` no configurado en dev local**: sin ese token, `/api/media` falla en cada intento de subir imagen ("Vercel Blob: No blob credentials found") — confirmado en vivo el 2026-08-25. No es un bug de código: hace falta pegar un token real de un Blob store de Vercel en `.env.local`. Hasta entonces, ningún content item/líder de tipo imagen se puede probar localmente (video sí funciona, es solo URL).

## Plataforma (mencionados en el PRD, fuera del MVP explícitamente)

- Rate limiting: implementado (Fase 5) solo en `/login` y `/accept-invite`. Otros endpoints públicos no tienen límite.
- Observabilidad externa (Sentry u equivalente): no configurado.
