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

## Verificación: bootstrap desde cero vs. Atlas de desarrollo

Fase 5: se comparó, colección por colección, el resultado de
`bootstrapSchema()` contra un Mongo temporal 100% vacío (no el Atlas de
desarrollo) contra el estado real del Atlas de desarrollo — mismos nombres
de colección, mismos índices (spec + `unique`/`expireAfterSeconds`), mismo
`$jsonSchema` validator. **Idéntico en las 14 colecciones, sin diferencias.**
Confirma que las 5 migraciones de arriba ya quedaron reflejadas en
`schema.ts` y que una base nueva no necesita ninguna de ellas — solo hacen
falta al migrar una base con historia previa.
