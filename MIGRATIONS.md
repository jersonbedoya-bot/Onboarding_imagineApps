# Migraciones y notas de performance

Este archivo registra dos cosas que no viven bien como comentario de código:
cambios manuales aplicados directamente sobre un Atlas ya existente (no
reproducibles corriendo `npm run db:bootstrap` sobre una base vieja), y
mediciones de performance que motivaron (o descartaron) un índice.

## Notas de performance

### `content.repository.findVisibleForRole` (y su equivalente en `leader`/`process`) — $or de scope sin índice dedicado

**Medido** (Fase 5, `explain("executionStats")` contra Mongo 6.0.14 en memoria,
no contra Atlas): una etapa con 820 `content_items` PUBLISHED repartidos en 4
roles (200 c/u) + 20 COMMON, consultada como 1 solo rol:

```
nReturned: 220 | totalDocsExamined: 820 | totalKeysExamined: 820 | executionTimeMillis: 9-11
```

Examina ~3.7x de más porque el planner de Mongo no descompone el `$or` de
`scope` en un scan por rama (uno acotado por `roleIds`, otro por
`scope:COMMON`) — usa un solo índice (`tenantId_1_status_1`) para todo y
filtra el resto en memoria dentro de `FETCH`.

Se probó el índice candidato obvio, `{tenantId, stageId, status, roleIds}`:
Mongo lo **consideró y lo rechazó** (aparece en `rejectedPlans`, no gana) —
no ayuda, porque ninguna rama del `$or` puede acotarse por `roleIds` a nivel
de índice sin que Mongo haga el rewrite de OR-por-rama, y no lo hace para
esta forma de query en esta versión.

**Decisión: no se agrega índice.** El dataset de prueba (200 items de un
mismo rol en una sola etapa) ya es muchísimo más grande que cualquier
volumen real esperado — el PRD describe ~8-10 temas por "Ruta por rol"
(§21), no cientos, y el producto está definido explícitamente para NO
sentirse como un LMS o biblioteca de contenidos (§3). Incluso en el caso
inflado de la medición, el tiempo de ejecución fue de un dígito de
milisegundos.

**Revisar si**: algún stage real llega a superar ~100 items PUBLISHED de un
mismo rol — ahí sí vale remedir con el volumen real y reconsiderar. Hasta
entonces, es ruido, no un problema.

## Migraciones manuales sobre Atlas

Todas aplicadas a mano contra el Atlas de desarrollo porque `ensureCollection`
(en `schema.ts`) **nunca** modifica el validador ni dropea índices de una
colección que ya existe — solo crea lo que falta. `db:bootstrap` sobre una
base **vacía** reproduce el estado final correcto sin ningún paso manual
(confirmado en Fase 5, ver "Verificación" al final de este archivo). Estas
migraciones solo hacen falta para llevar una base **existente**, con historia
previa a cada cambio, al estado actual.

### 1. Fase 3A — `onboarding_routes`: índice por rol → único por tenant

Antes: `{tenantId, roleId}`. Ahora: `{tenantId}` único.

**Por qué**: decisión de arquitectura — una sola ruta por tenant (no una por
rol funcional); lo común/específico vive en `content_items.scope`, no en la
estructura de la ruta.

**Cómo migrar una base existente**: confirmar que la colección está vacía o
que no hay más de una ruta por tenant, dropear el índice viejo
(`{tenantId,roleId}`) y correr `db:bootstrap` para que cree el nuevo único.

### 2. Fase 3B — `processes`: índices de rol único → scope+roleIds

Antes: `{tenantId, roleId, status}`. Ahora: `{tenantId, status}` +
`{tenantId, roleIds}`.

**Por qué**: `processes` pasó al mismo modelo de `scope: COMMON|ROLE` +
`roleIds[]` que `content_items`/`leaders`, reemplazando el `roleId` singular
original.

**Cómo migrar una base existente**: confirmar que no hay documentos con el
campo viejo `roleId` sin migrar a `scope`/`roleIds`, dropear el índice
`{tenantId,roleId,status}`, correr `db:bootstrap`.

### 3. Fase 4 — `user_progress`: `collMod` a schema polimórfico

Antes: `{tenantId, userId, stepId, processId, stageId, status, startedAt,
completedAt, updatedAt}`, único por `{tenantId,userId,stepId}`.
Ahora: `{tenantId, userId, targetType, targetId, stageId, processId,
completedAt}`, único por `{tenantId,userId,targetType,targetId}`. Sin
`status`/`startedAt` — la existencia del documento ES el hecho de
completado, nada escribe estados intermedios.

**Por qué**: la unidad completable dejó de ser solo `process_step` — pasó a
incluir `content_items` OBLIGATORY (acuse de lectura) y el hecho sticky de
"etapa completada" (`targetType: "STAGE"`), todos como el mismo tipo de
registro con una referencia polimórfica.

**Cómo migrar una base existente**: si ya hay progreso real guardado con el
schema viejo, escribir un script de transformación documento a documento
(`stepId` → `targetType:"STEP", targetId:stepId`) antes del `collMod` — no
se hizo acá porque la colección estaba vacía (nadie había completado nada
todavía). Dropear el índice único viejo
(`{tenantId,userId,stepId}`), aplicar el `collMod` del nuevo validador
(ver `src/server/db/schema.ts`), correr `db:bootstrap` para los índices
nuevos.

### 4. Fase 5 — `users`: drop de `{tenantId,platformRole}`, alta de `{tenantId,createdAt}`

**Por qué**: `explain()` confirmó que ningún query filtra realmente por
`platformRole` (grep de todo `user.repository.ts`: los únicos filtros son
`email`, `_id`, o `{tenantId}` solo) — el índice viejo solo servía por su
prefijo `tenantId`, igual que el nuevo. El nuevo índice sí resuelve un
problema medido: `listByTenant` (admin, paginado) hacía `SORT` en memoria
sobre `createdAt`, trayendo TODOS los usuarios del tenant a memoria antes de
paginar (medido: 80/80 `docsExamined` para devolver 20).

**Cómo migrar una base existente**: dropear `tenantId_1_platformRole_1`,
correr `db:bootstrap` (crea `{tenantId,createdAt}` solo, no recrea el viejo
porque ya no está en `schema.ts`).

### 5. Fase 5 — `audit_logs`: alta de `{tenantId,action,timestamp}`

**Por qué**: `explain()` midió que filtrar por `action` sin este índice
forzaba a recorrer TODO el `audit_logs` del tenant ordenado por fecha
(96/96 `docsExamined` para devolver 20) — necesario para los filtros de la
página `/admin/audit`.

**Cómo migrar una base existente**: correr `db:bootstrap` (solo agrega, no
requiere dropear nada).

### 6. Invitación de administradores — `invitations`: `collMod` para `platformRole` + `functionalRoleId` nullable

Antes: `functionalRoleId` requerido y siempre `objectId` (toda invitación
era, implícitamente, para un `USER` con rol funcional). Ahora: nuevo campo
requerido `platformRole: "USER" | "ADMIN"`, y `functionalRoleId` pasa a
`["objectId", "null"]` — `null` cuando `platformRole === "ADMIN"` (un
admin no tiene rol funcional, mismo patrón ya usado en `users`).

**Por qué**: pedido explícito de poder invitar administradores desde
`/admin/users` (antes el único ADMIN posible era el sembrado por
`db:seed`, sin ningún flujo para agregar un segundo).

**Aplicado en Atlas de desarrollo el 2026-08-25**: `collMod` de
`invitations` al nuevo validador, más un backfill de `{ platformRole:
"USER" }` sobre los documentos existentes que no tenían el campo (1
invitación afectada) — sin este backfill, el validador strict las hubiera
dejado inválidas para cualquier escritura futura sobre ellas (ej.
`markAccepted`).

**Cómo migrar una base existente**: `collMod` de `invitations` al
validador actual de `schema.ts`, seguido del backfill de arriba, luego
`db:bootstrap` (agrega el índice si faltara — no cambió en este paso).

## Migraciones de contenido (no-schema)

A diferencia de todo lo de arriba, esto no toca `schema.ts` — es una
reasignación de `stageId` sobre `content_items`/`processes` existentes más
rename/reorder de `onboarding_stages`, algo que el admin panel no soporta
hoy (`ProcessForm` solo setea `stageId` al crear un proceso, nunca al
editarlo). Se documenta acá por el mismo motivo que las migraciones de
schema: no es reproducible corriendo `db:bootstrap`/`db:seed`.

### 7. Fusión de fases del recorrido de onboarding (tenant imagine-apps)

**Antes** (4 fases numeradas + Recursos, decidido en conversación con el
usuario tras notar que la navegación se sentía corta): Fase 01 · Bienvenida
y Cultura (incluía Principios No Negociables) → Fase 02 · Cómo Trabajamos
(en realidad, por un rename previo, contenía el Ciclo de Vida del
Proyecto) → Fase 03 · Tu Entorno de Trabajo (Ecosistema Digital +
Timeboxing) → Fase 04 · Tu Rol y Responsabilidades (Tu rol + procesos por
rol) → Recursos.

**Después** (3 fases + Recursos): Fase 01 · Bienvenida y Cultura (sin No
Negociables) → Fase 02 · Cómo Trabajamos (No Negociables + Entorno de
Trabajo, con aviso hacia Recursos) → Fase 03 · Los Proyectos y Tu Rol en
Ellos (Ciclo de Vida + Tu Rol fusionados, un solo stage con pastillas de
`phase-groups.ts` combinadas) → Recursos (sin cambio de contenido, solo
`order` 5→4).

**Por qué**: "No Negociables" es comportamiento operativo (reglas de
transparencia/reuniones/timeboxing), encaja mejor en "Cómo Trabajamos" que
en la fase de identidad/cultura. Ciclo de Vida y Tu Rol son dos lentes del
mismo tema (el arco genérico del proyecto, y qué hacés vos específicamente
dentro de ese arco) — separarlas en dos fases obligaba a completar "el
proyecto en general" antes de descubrir "tu parte en él", como si fueran
temas inconexos.

De paso se encontró (no relacionado a la fusión) que el content item con
los 5 valores de cultura estaba `ARCHIVED` — reemplazado por "🎯 Nuestra
Historia", que no los tenía. Se fusionó ese texto dentro de "Nuestra
Historia" para no perderlo (el `ARCHIVED` no se reactiva, es transición
terminal — ver `assertValidTransition`).

**Aplicado en Atlas de desarrollo el 2026-09-02**, vía
`scripts/migrate-merge-fases.ts` (dry-run por defecto, `--apply` para
escribir de verdad; siempre escribe antes un backup JSON de cada documento
tocado en `scripts/.backups/`). El script:

1. Mueve `stageId` de "Principios No Negociables" y de los 8 procesos de
   ciclo de vida a sus stages destino (reasignación directa vía `getDb()`,
   no vía repository — el campo no es editable por ahí, ver arriba).
2. Actualiza el body de "Nuestra Historia" con el texto fusionado.
3. Usa el `stage.service` real (`updateStage`/`archiveStage`/`deleteStage`)
   para renombrar/reordenar las 2 fases sobrevivientes y borrar la que
   quedó vacía — así el cambio queda en `audit_logs` como cualquier edición
   hecha desde el admin panel.

No se migraron los `user_progress` de tipo `STAGE` (el "hecho sticky" de
etapa completada) del stage borrado — quedan huérfanos, mismo estado que ya
existía en la base para 2 registros de una reorganización anterior (sin
impacto: ese `targetType` es solo una cache de idempotencia, ver comentario
en `progress.service.ts`; el progreso real —`STEP`/`CONTENT_ITEM`— no
referencia `stageId` como clave y sigue siendo válido tras el move).

**Cómo migrar otra base existente** (ej. producción, cuando se promueva):
correr `scripts/migrate-merge-fases.ts --apply` contra esa base — los IDs
de stage/content/proceso están hardcodeados para el tenant imagine-apps de
desarrollo, así que un tenant distinto necesita adaptarlos primero (leer el
estado real con una consulta de solo lectura antes de tocar nada — el
`matchTitle` de `scripts/data/onboarding-content.ts` ya está desactualizado
respecto al título real de las etapas, no usarlo como fuente de verdad).

### 8. Pliegue de "Recursos" dentro de "Cómo Trabajamos" (tenant imagine-apps)

**Antes**: Recursos era una etapa aparte (`key: "recursos"`), siempre
desbloqueada y fuera del recorrido secuencial (ver el comentario que tenía
`resources/page.tsx`, hoy eliminado), con link propio en `OnboardingTopbar`.
Contenía 3 content items informativos: Política de Vacaciones, Política de
Citas Médicas, Política de Cumpleaños.

**Después**: esas 3 políticas pasaron a ser content items reales de "🧭 Tu
Día a Día en Imagine Apps" (el módulo de la migración #7, antes titulado
"🔄 Fase 02 · Cómo Trabajamos" — se le sacó el "Fase 02" del título porque
ya no describía todo lo que contiene). El módulo quedó con 6 content items
en 2 secciones visuales (`contentItemSection` en `phase-groups.ts`):
"Reglas y Herramientas" (No Negociables, Ecosistema Digital, Timeboxing) y
"Bienestar y Permisos" (las 3 políticas). El stage `recursos` y la ruta
`/onboarding/resources` se eliminaron.

**Por qué**: decisión explícita del usuario — no le gustaba el patrón
"card-aviso que linkea afuera" (mismo patrón que sí se mantiene para
Equipo, ver `TeamTeaser`) para un contenido tan chico (3 políticas
cortas); prefirió que fuera contenido real del módulo. **Trade-off
aceptado a propósito**: esas 3 políticas dejan de estar "siempre
disponibles" — antes se veían sin importar en qué fase estuvieras, ahora
solo mientras estás parado en este módulo específico. Sin impacto en
completable/bloqueo: las 3 son `requirement: INFORMATIONAL`, nunca
contaron para `totalCompletableOf` (ver `progress.service.ts`).

**Aplicado en Atlas de desarrollo el 2026-09-02**, vía
`scripts/migrate-fold-recursos.ts` (mismo patrón dry-run/`--apply`/backup
JSON que la migración #7). Mueve el `stageId` de las 3 políticas, renombra
el módulo destino, y archiva+borra el stage `recursos` ya vacío vía
`stage.service` real.

**Cómo migrar otra base existente**: correr
`scripts/migrate-fold-recursos.ts --apply` después de la #7 (depende de que
el stage de Cómo Trabajamos ya exista con ese `_id`) — mismo aviso: IDs
hardcodeados para el tenant de desarrollo, adaptar para otro tenant.

### 9. Links reales de herramientas + remoción de "Agents Hub" (tenant imagine-apps)

A diferencia de #7/#8, esta no toca `stageId` ni estructura de etapas — son
ediciones de contenido normales (body/objective/context/expectedResult/
resources de content_items, processes y process_steps), así que
`scripts/migrate-add-tool-links.ts` corre por los `*.service.ts` reales
(`updateContentItem`/`updateProcess`/`updateStep`), no por `getDb()`
directo — cada cambio quedó en `audit_logs` como una edición normal desde
el admin panel. A diferencia de #7/#8, el clasificador de auto-mode de
Claude Code **no bloqueó** este `--apply` — parece tratar distinto una
escritura vía service (edición de contenido reconocible) que una
reasignación de `stageId`/archivado de stage.

**Origen**: el usuario pidió (a) agregar links reales a herramientas
mencionadas como texto plano — Basecamp, Google Drive, Magi para
Daily/Weekly — usando las URLs reales de "Metologías (All).md" (archivo
gitignored, insumo de contenido, no versionado), y (b) remover toda
mención de "Agents Hub" (decisión de producto: ya no se usa en la
operación). "OPS HUB" ya no aparecía en ningún lado del contenido vivo al
auditar (alguien ya lo había limpiado en un pase anterior).

**Decisiones confirmadas con el usuario antes de escribir el script**
(ninguna de las 3 estaba resuelta por el documento o el código):

- **Magi**: no aparece en "Metologías (All).md" ni en el contenido — URL
  confirmada por el usuario: `https://magi.imagineapps.co/login`.
- **Gimena** (la IA para HUs, hoy envuelta en "Agents Hub"): el documento
  tenía un link, pero es una IP interna cruda
  (`http://3.132.40.53:9002/app`) — el usuario aclaró que Gimena es parte
  de Agents Hub y por lo tanto **tampoco va** en el onboarding: se removió
  sin reemplazo (ni el link, ni un tool alternativo inventado).
- **Google Drive**: el único link del documento era la carpeta de un
  proyecto puntual, no un punto de entrada general — se usó un link
  genérico a `drive.google.com` en su lugar.

**Contenido tocado**: 1 content_item ("💻 Ecosistema Digital de Trabajo" —
linkea Basecamp/Drive, agrega Magi, remueve la mención de Agents Hub), 6
processes (Kickoff Interno, Generación de HUs, Construcción de Plan de
Trabajo, Daily, Weekly, Actas de Reunión) y 6 process_steps. El paso
"Invocar a Gimena" (dentro de Generación de HUs) se reescribió en vez de
borrarse — pasó a "Redactar la historia de usuario" sin nombrar ninguna
herramienta de IA — para no perder el progreso ya completado por usuarios
que ya hicieron ese paso (`user_progress` referencia el `stepId`, que no
cambió).

**Nota de alcance**: `process_steps` tiene un campo `links: string[]`
(validado en `step.schema.ts`) pensado exactamente para esto, pero **no
está renderizado en ningún lado de la UI hoy** (`ProcessStepsTimeline` no
lo lee) — usarlo no habría mostrado nada al usuario. Por eso los links se
insertaron como Markdown (`[texto](url)`) dentro de los campos de texto que
sí se renderizan (`objective`/`context`/`expectedResult`/`instruction` vía
`MarkdownContent`, que ya soporta `<a>`). Si en el futuro se quiere un
tratamiento visual propio para "herramientas con link" (ej. chips
clickeables en vez de texto embebido), ahí sí valdría la pena construir esa
UI y migrar estos links al campo `links` real.

**Aplicado en Atlas de desarrollo el 2026-09-02**, vía
`scripts/migrate-add-tool-links.ts` (mismo patrón dry-run/backup/`--apply`).

**Cómo migrar otra base existente**: correr
`scripts/migrate-add-tool-links.ts --apply` — mismo aviso que #7/#8: IDs
hardcodeados para el tenant de desarrollo, adaptar para otro tenant. Si
las URLs de Basecamp/Magi/Drive cambian, actualizar las constantes al
principio del script.

## Verificación: bootstrap desde cero vs. Atlas de desarrollo

Fase 5: se comparó, colección por colección, el resultado de
`bootstrapSchema()` contra un Mongo temporal 100% vacío (no el Atlas de
desarrollo) contra el estado real del Atlas de desarrollo — mismos nombres
de colección, mismos índices (spec + `unique`/`expireAfterSeconds`), mismo
`$jsonSchema` validator. **Idéntico en las 14 colecciones, sin diferencias.**
Confirma que las 5 migraciones de arriba ya quedaron reflejadas en
`schema.ts` y que una base nueva no necesita ninguna de ellas — solo hacen
falta al migrar una base con historia previa.
