# Imagine Apps — Plataforma Multi-Tenant de Onboarding Operativo

Aplicación web **SaaS multi-tenant** para gestionar el proceso de incorporación, adaptación y aprendizaje operativo de los nuevos integrantes de una organización. Construida con **Next.js 16 (App Router) + TypeScript + MongoDB + Tailwind CSS**.

> **"Te acompañamos paso a paso para entender cómo trabajamos y cómo hacer tu trabajo."**
>
> No es un LMS, una biblioteca de documentos ni un centro de cursos: es un **recorrido guiado** desde el día 1.

---

## Índice

1. [Visión del producto](#1-visión-del-producto)
2. [Stack tecnológico](#2-stack-tecnológico)
3. [Requisitos previos](#3-requisitos-previos)
4. [Configuración inicial](#4-configuración-inicial)
5. [Scripts disponibles](#5-scripts-disponibles)
6. [Arquitectura](#6-arquitectura)
7. [Estructura del proyecto](#7-estructura-del-proyecto)
8. [Modelo de datos](#8-modelo-de-datos)
9. [Autenticación y autorización](#9-autenticación-y-autorización)
10. [Roles](#10-roles)
11. [Ruta de onboarding](#11-ruta-de-onboarding)
12. [Progreso](#12-progreso)
13. [Seguridad](#13-seguridad)
14. [API Routes](#14-api-routes)
15. [Manejo de errores](#15-manejo-de-errores)
16. [Testing](#16-testing)
17. [Migraciones y performance](#17-migraciones-y-performance)
18. [Backlog y features diferidas](#18-backlog-y-features-diferidas)
19. [Documentación relacionada](#19-documentación-relacionada)

---

## 1. Visión del producto

La plataforma permite a organizaciones gestionar el onboarding operativo de sus nuevos integrantes de forma guiada. Cada nuevo integrante conoce:

- **La organización** (misión, visión, valores, cultura).
- **A sus líderes** relevantes del equipo.
- **Los principios de trabajo** (no negociables).
- **Los procesos necesarios** para desempeñar su rol.

Todo el contenido es **editable desde un panel administrativo**, sin depender del equipo de desarrollo para modificarlo. La seguridad es **multi-tenant**: cada organización (tenant) mantiene sus datos completamente aislados.

El detalle funcional completo está definido en el documento **`PRD — Plataforma Multi-Tenant de Onboarding Operativo Imagine Apps.md`**.

---

## 2. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| **Framework** | Next.js 16.3.1 (App Router, Turbopack, Server Components) |
| **Lenguaje** | TypeScript 5 (modo `strict`) |
| **Base de datos** | MongoDB (Atlas) + driver `mongodb` + `mongodb-memory-server` (tests) |
| **Autenticación** | NextAuth v5 (proveedor credentials, sesiones JWT) |
| **Validación** | Zod 4 |
| **Hashing** | bcryptjs |
| **Media / Storage** | Vercel Blob (`@vercel/blob`) |
| **Estilos** | Tailwind CSS 4 |
| **Testing** | Vitest 4 |
| **Lint** | ESLint 9 (`eslint-config-next`) |
| **Deploy** | Vercel |

### Principios rectores (PRD §68)

> **Simplicidad → Seguridad → Mantenibilidad → Performance → Escalabilidad**

- **Monolito modular**: sin microservicios, sin Redis/Kafka/workers.
- **Stateless**: el estado persistente vive en MongoDB, no en memoria del servidor.
- **Sin cache externa**: se optimiza con índices MongoDB, queries eficientes, Server Components y revalidación nativa de Next.js.
- **1 cuenta = 1 tenant**: login sin selección de tenant.

---

## 3. Requisitos previos

- **Node.js** `20.19.0` (ver `.nvmrc`).
- Una instancia de **MongoDB Atlas** (o un `mongod` local).
- Opcional: un **Blob store de Vercel** para subir imágenes (requiere `BLOB_READ_WRITE_TOKEN`).

---

## 4. Configuración inicial

### 4.1 Instalar dependencias

```bash
npm install
```

### 4.2 Variables de entorno

Copia `.env.example` a `.env.local` y completá las variables:

| Variable | Requerida | Descripción |
|----------|:---------:|-------------|
| `MONGODB_URI` | ✅ | Cadena de conexión a MongoDB Atlas/local |
| `AUTH_SECRET` | ✅ | Secreto de firma de sesiones de NextAuth (JWT) |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL pública de la app (ej. `http://localhost:3000`) |
| `BLOB_READ_WRITE_TOKEN` | ⚠️ | Token de Vercel Blob (solo para subir imágenes) |
| `SEED_ADMIN_EMAIL` | ⚠️ | Email del admin de arranque (para `db:seed`) |
| `SEED_ADMIN_PASSWORD` | ⚠️ | Password del admin de arranque |
| `SEED_PDM_EMAIL` / `SEED_PDM_PASSWORD` | ⚠️ | Usuario funcional PDM de desarrollo |
| `SEED_UX_EMAIL` / `SEED_UX_PASSWORD` | ⚠️ | Usuario funcional UX/UI de desarrollo |

> Las variables de entorno se leen de forma perezosa en `src/server/config/env.ts`. Las `SEED_*` solo se usan en `npm run db:seed`.

### 4.3 Inicializar la base de datos

```bash
# Crea las colecciones con sus validadores $jsonSchema e índices (idempotente)
npm run db:bootstrap

# Siembra tenant "Imagine Apps", roles funcionales (PDM, UX/UI) y primer admin
npm run db:seed
```

### 4.4 Levantar el servidor de desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). El flujo post-login redirige según el rol: `ADMIN` → `/admin/modules`, `USER` → `/onboarding`.

---

## 5. Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (Next.js + Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run db:bootstrap` | Crea colecciones + índices + validadores en MongoDB (idempotente) |
| `npm run db:seed` | Siembra tenant, roles y usuarios de arranque (idempotente) |
| `npm run db:verify` | Verifica la validación de una base existente |
| `npm run test` | Ejecuta los tests (Vitest) |

---

## 6. Arquitectura

La aplicación sigue una **arquitectura en capas** con separación clara de responsabilidades (PRD §35):

```text
Browser
   ↓
Next.js (UI Components / Server Components)
   ↓
Route Handlers (API)          →  src/app/api/**
   ↓
Services (lógica de negocio)  →  src/server/services/**
   ↓
Repositories (acceso a datos) →  src/server/repositories/**
   ↓
MongoDB
```

### Capas

- **UI / Presentación** (`src/app`, `src/components`): Server Components por defecto. Client Components (`'use client'`) solo donde hay interactividad (toggles, formularios, eventos).
- **Route Handlers** (`src/app/api/**`): exponen la API, validan entrada con Zod en el borde, llaman a servicios y traducen errores con `toErrorResponse`.
- **Services** (`src/server/services/**`): orquestan casos de uso, aplican reglas de negocio, validan pertenencia a tenant y registran auditoría.
- **Repositories** (`src/server/repositories/**`): única capa que toca MongoDB. Aplican scoping por `tenantId` en los filtros (nunca en frontend). Tanto para recursos inexistentes como cross-tenant devuelven `NotFoundError` (no se confirma la existencia de datos de otro tenant).
- **Schema de Mongo** (`src/server/db/schema.ts`): fuente única de verdad con validadores `$jsonSchema` e índices (defensa en profundidad detrás de Zod).

### Inversión de dependencias y contratos

- El **MediaProvider** (`src/server/media/provider.ts`) se inyecta en `media.service`, permitiendo cambiar de proveedor de storage sin tocar la lógica de negocio (PRD §54).
- El schema de Mongo vive en **un solo lugar** (`schema.ts`), compartido entre el bootstrap real (`db:bootstrap`) y el setup de tests de integración.

---

## 7. Estructura del proyecto

```text
src/
├── app/                          # Rutas y páginas (App Router)
│   ├── (admin)/                  # Panel administrativo (protegido)
│   │   ├── layout.tsx
│   │   └── admin/
│   │       ├── modules/           # Ruta + etapas + su contenido y procesos, todo por módulo
│   │       │   └── [stageId]/     # Detalle: contenido + procesos de esa etapa
│   │       ├── processes/[id]/    # Pasos de un proceso (se llega desde su módulo)
│   │       ├── leaders/          # Líderes
│   │       ├── preview/          # Ver el onboarding por rol funcional, solo lectura (Admin y Editor)
│   │       ├── messages/         # Título/subtítulo del recorrido + mensajes de guía editables (solo Admin)
│   │       ├── users/            # Usuarios + invitaciones (solo Admin)
│   │       └── audit/            # Log de auditoría (solo Admin)
│   ├── (public)/                 # Rutas públicas
│   │   ├── login/
│   │   └── accept-invite/[token]/
│   ├── (user)/                   # Experiencia de onboarding
│   │   └── onboarding/
│   │       ├── page.tsx          # Recorrido completo
│   │       └── leaders/          # Conoce a tu equipo
│   ├── api/                      # Route Handlers (REST)
│   └── layout.tsx / globals.css / page.tsx
├── components/                   # Componentes reutilizables
│   ├── admin/                    # Nav/headers + formularios y acciones reutilizados por
│   │                              # las páginas de /admin/modules (StageForm/Actions,
│   │                              # ContentForm/Actions, ProcessForm/Actions, ArchivedSection)
│   └── ... UI (Button, Card, Badge, Modal, ConfirmModal, Toast, DataTable, ModuleSummaryBadge, ...)
├── lib/                          # Helpers (cn, slug, email, token, video-url, logger, ...)
├── server/                       # Backend
│   ├── auth/                     # NextAuth + guards de sesión
│   ├── config/env.ts             # Variables de entorno tipadas
│   ├── db/                       # Conexión Mongo + schema
│   ├── errors/                   # Errores de dominio + handler HTTP
│   ├── media/                    # Proveedor de storage (contrato + impl)
│   ├── repositories/             # Capa de acceso a datos
│   ├── services/                 # Lógica de negocio
│   └── validation/               # Schemas Zod por entidad
├── types/                        # Tipos y enums compartidos
└── proxy.ts                      # Proxy de autenticación (Next.js)
```

> Los scripts CLI (`bootstrap-db.ts`, `seed-bootstrap.ts`, `verify-validation.ts`) viven en `scripts/` en la raíz del repo.

---

## 8. Modelo de datos

Colecciones en MongoDB (ver `src/server/db/schema.ts` para el detalle completo de validadores e índices):

| Colección | Propósito |
|-----------|-----------|
| `tenants` | Organizaciones (índice único por `slug`). |
| `users` | Usuarios (email único global; índice `{tenantId, createdAt}`). |
| `roles` | Roles funcionales (único por `{tenantId, key}`). |
| `invitations` | Invitaciones; solo se persiste el hash del token (nunca el crudo). |
| `onboarding_routes` | Ruta de onboarding; **una sola por tenant** (índice único `{tenantId}`). Incluye título/subtítulo del recorrido y los 2 mensajes de guía toggle-ables, editables desde `/admin/messages`. |
| `onboarding_stages` | Etapas de la ruta (orden, dependencias, bloqueo). |
| `content_items` | Contenido común / por rol (`scope` + `roleIds[]`). |
| `leaders` | Líderes del equipo (`scope` + `roleIds[]`, video/foto). |
| `processes` | Procesos operativos (`scope` + `roleIds[]`). |
| `process_steps` | Pasos de un proceso (título, instrucción, criterio de finalización). |
| `user_progress` | Progreso del usuario (referencia polimórfica `STEP`/`CONTENT_ITEM`/`STAGE`). |
| `media` | Metadata de archivos (solo imágenes en el MVP). |
| `audit_logs` | Auditoría de acciones administrativas. |
| `rate_limit_attempts` | Rate limiting (global, con TTL). |

### Decisiones de diseño clave

- **Ciclo de vida de contenido** `DRAFT → PUBLISHED → ARCHIVED` (PRD §29), validado en `src/lib/content-status.ts` para ruta/etapas/content_items/líderes/procesos/pasos por igual. `ARCHIVED` no es terminal: cada entidad tiene un `reactivate*` (servicio + `POST .../reactivate`) que vuelve a `DRAFT` — nunca directo a `PUBLISHED`, hay que republicar a mano.
- **Referencia polimórfica de progreso** (`user_progress`): la existencia del documento **ES** el hecho de completado. No hay estados intermedios (`PENDING`/`IN_PROGRESS`). Ver `src/server/services/progress-derivation.ts`.
- **Contenido común vs. por rol**: `scope: COMMON` (todos) o `scope: ROLE` + `roleIds[]`, presente en `content_items`, `leaders` y `processes`.
- **Una sola ruta por tenant** (no una por rol funcional): lo común/específico vive en `scope`, no en la estructura de la ruta.

---

## 9. Autenticación y autorización

### Flujo

1. **Login** (NextAuth Credentials): verifica email + password, con rate limiting.
2. **JWT de sesión**: NextAuth persiste **solo identidad firmada** (`userId`, `tenantId`), vigente hasta 8h.
3. **Guards de autoridad**: `requireActiveUser()` / `requireAdmin()` (`src/server/auth/session.ts`) se llaman en **cada request protegida**. Leen el estado real (`status`, `platformRole`, `functionalRoleId`) desde MongoDB en cada request, de modo que una desactivación o cambio de rol del admin tiene efecto **inmediato** (no depende de la expiración del token).
4. **Proxy**: `src/proxy.ts` hace un chequeo **optimista** (solo valida que exista un JWT, sin tocar Mongo) para redirecciones de UX. No es la línea de defensa real.

### Rutas públicas (`proxy.ts`)

- `/` — redirige según rol.
- `/login`.
- `/accept-invite/*` — con token en el path.
- `POST /api/invitations` (sin segmento extra) está protegida; las rutas con token (`/api/invitations/{token}`, `/api/invitations/{token}/accept`) son públicas.

---

## 10. Roles

### 10.1 Rol de plataforma (`platformRole`)

| Rol | Acceso |
|-----|--------|
| **USER** (Imaginer) | Realizar su onboarding, consultar contenido, completar pasos, consultar progreso. |
| **EDITOR** | Entra al panel admin: crea/edita/publica contenido, líderes, procesos y pasos. No archiva/borra/reactiva nada, ni gestiona módulos (stages), usuarios, auditoría o mensajes de guía (ver `requireContentEditor`, `src/server/auth/session.ts`). |
| **ADMIN** | Todo lo de EDITOR más: archivar/borrar/reactivar cualquier recurso, gestionar módulos, usuarios/invitaciones (incluyendo cambiar el nivel de acceso de otros vía `PATCH /api/users/{id}/platform-role`), mensajes de guía, y ver auditoría. |

Ni EDITOR ni ADMIN hacen el recorrido de onboarding (ninguno tiene `functionalRoleId`). Los roles de plataforma están definidos en `src/types/enums.ts` (`PLATFORM_ROLES`); el nivel de acceso se distingue del **rol funcional** (10.2) — son dos ejes independientes.

### 10.2 Rol funcional (`functionalRoleId`)

Define qué tipo de onboarding recibe el usuario. Iniciales: `PDM`, `UX_UI_DESIGNER`. Extensible agregando filas en la colección `roles` (ej. `DEVELOPER`, `QA`, etc.) sin tocar la arquitectura.

El rol funcional se asigna **siempre desde la invitación** (nunca elegido por el usuario en el registro — regla PRD §12). Un `ADMIN` no tiene rol funcional.

---

## 11. Ruta de onboarding

La ruta es la columna vertebral de la experiencia: una sola por tenant, dividida en **etapas** (módulos) que el usuario recorre una a la vez.

- **Una sola ruta por tenant** (singleton), componible por **etapas** en orden configurable, con **dependencias** (una etapa puede bloquear la siguiente mediante `dependsOnStageId` + `isBlocking`).
- Cada etapa agrupa **content items** y **procesos** (con sus pasos).
- Los **content items** pueden ser `TEXT`, `VIDEO`, `IMAGE` o `MIXED`, con requirement `OBLIGATORY` (acuse de lectura, bloquea el avance) o `INFORMATIONAL` (se marca visto solo con scroll, nunca bloquea).
- **Quiz de cierre de módulo (opcional)**: un content item cuyo título matchea `isQuizContent` (`src/lib/institutional-content.ts`) se interpreta como preguntas de opción múltiple en Markdown (`parseQuizQuestions`) y se renderiza vía `QuizBlock` dentro de un modal que se abre al pulsar "Siguiente módulo". El botón para avanzar dentro de ese modal solo se habilita cuando el usuario respondió las N preguntas (la respuesta no necesita ser correcta) — puramente client-side, no persiste en `user_progress`.
- La visibilidad del contenido sigue una **cascada**: Ruta `PUBLISHED` → Etapa `PUBLISHED` → Item/Proceso `PUBLISHED` con `scope` que matchee el rol del usuario. Si cualquier eslabón de la cadena no está publicado, el contenido no aparece (`resolveVisibleContent`, `resolveVisibleProcesses`, `resolveVisibleSteps`).

---

## 12. Progreso

El progreso se **deriva**, no se almacena como porcentaje (PRD §24). Se reconstruye desde los registros de `user_progress`:

- **`STEP`**: completar un paso de proceso.
- **`CONTENT_ITEM`**: acuse de lectura de contenido obligatorio.
- **`STAGE`**: hecho "sticky" de que una etapa quedó completa (una vez que la etapa está 100% completada).

La lógica central vive en `src/server/services/progress-derivation.ts` y `progress.service.ts`, con auto-reparación idempotente si el hecho sticky de una etapa no llegó a persistirse al completar el último ítem (`resolveJourney` / `resolveJourneyFor`). La vista principal la consume `/onboarding` y `GET /api/progress/journey`.

---

## 13. Seguridad

- **Multi-tenancy**: todo query filtra por `tenantId`. Los services validan la pertenencia de referencias (etapa/media/rol/proceso) al tenant del actor (`assertStageBelongsToTenant`, `assertRoleIdsBelongToTenant`, etc.). Los recursos de otro tenant no se distinguen de inexistentes (`NotFoundError`, nunca `ForbiddenError`, para no confirmar existencia ajena).
- **Validación en backend**: cada entidad tiene su schema Zod (`src/server/validation/*`) validado en el borde de la API, más defensa en profundidad con validadores `$jsonSchema` en MongoDB.
- **Hashing de password** con bcryptjs (costo 12).
- **Tokens de invitación**: el token crudo (256 bits) solo se muestra una vez; en la base solo vive su hash SHA-256 (`src/lib/token.ts`).
- **Video embebido con allowlist**: las URLs de video se validan/normalizan contra YouTube/Vimeo/Loom únicamente (`src/lib/video-url.ts`), nunca se renderiza una URL cruda en `<iframe>` (mitiga XSS).
- **Rate limiting** (`src/server/services/rate-limit.service.ts`) en `/login` (por email e IP) y `/accept-invite` (por token).
- **Auditoría** de acciones administrativas en `audit_logs` (28 acciones, ver `src/server/repositories/audit.repository.ts`).
- **Invitación de administradores**: un ADMIN no tiene rol funcional; el flujo valida que un `USER` tenga rol y que un `ADMIN` no lo tenga (`createInvitationSchema`).

---

## 14. API Routes

Todas bajo `src/app/api/`. Las rutas administrativas exigen `requireAdmin()`; las de progreso/lectura exigen `requireActiveUser()`; las de invitación con token son públicas.

| Área | Endpoints | Descripción |
|------|-----------|-------------|
| **Auth** | `POST /api/auth/...` | NextAuth (login, callback, signout). |
| **Usuarios** | `GET /api/users`, `POST /api/users/{id}/deactivate`, `/reactivate`, `PATCH /api/users/{id}/role` (rol funcional), `PATCH /api/users/{id}/platform-role` (nivel de acceso USER/EDITOR/ADMIN) | Gestión de usuarios por el admin. No hay creación directa: los usuarios nacen al aceptar una invitación. |
| **Invitaciones** | `POST /api/invitations`, `GET /api/invitations/{token}`, `POST /api/invitations/{token}/accept` | Crear/previsualizar/aceptar invitaciones. |
| **Ruta** | `GET /api/route`, `PATCH /api/route`, `POST /api/route/publish`, `/archive`, `/reactivate` | Gestión de la ruta (singleton) — `PATCH` edita headline/subtitle/mensajes de guía. |
| **Etapas** | `GET/POST /api/stages`, `PATCH/DELETE /api/stages/{id}`, `POST .../publish`, `/archive`, `/reactivate` | Gestión de etapas. |
| **Contenido** | `GET/POST /api/content`, `PATCH/DELETE /api/content/{id}`, `POST .../publish`, `/archive`, `/reactivate`, `GET /api/content/resolve` | Gestión y resolución de content items. |
| **Líderes** | `GET/POST /api/leaders`, `PATCH/DELETE /api/leaders/{id}`, `POST .../publish`, `/archive`, `/reactivate`, `GET /api/leaders/resolve` | Gestión y resolución de líderes. |
| **Procesos** | `GET/POST /api/processes`, `PATCH/DELETE /api/processes/{id}`, `POST .../publish`, `/archive`, `/reactivate` | Gestión de procesos. |
| **Pasos** | `GET/POST /api/steps`, `PATCH/DELETE /api/steps/{id}`, `POST .../publish`, `/archive`, `/reactivate`, `GET /api/steps/resolve` | Gestión y resolución de pasos. |
| **Roles** | `GET /api/roles` | Listado de roles funcionales. |
| **Progreso** | `GET /api/progress/journey`, `POST /api/progress/content/{id}/read`, `/content/{id}/view`, `/steps/{id}/complete`, `/processes/{id}/complete` | "Dónde estoy", acuse de lectura (obligatorio), vista pasiva (informativo) y completar pasos/procesos. |
| **Media** | `POST /api/media` | Subida de imágenes (Vercel Blob). |
| **Auditoría** | `GET /api/audit` | Log de auditoría con filtros y paginación. |

---

## 15. Manejo de errores

- **Errores de dominio** (`src/server/errors/index.ts`): `AppError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`, `RateLimitedError`.
- **Handler central** (`src/server/errors/handler.ts`): `toErrorResponse()` traduce cualquier error a un body JSON consistente. Nunca expone stack traces, queries ni detalles internos (PRD §51). Los errores no esperados colapsan en `INTERNAL_ERROR` (500) y el detalle queda solo en el log.

Formato de respuesta de error:

```json
{
  "success": false,
  "error": { "code": "RESOURCE_NOT_FOUND", "message": "El recurso solicitado no existe." }
}
```

---

## 16. Testing

- Framework: **Vitest** (`vitest.config.ts`, alias `@/` → `src/`).
- **Unitario**: reglas de negocio, validaciones, derivación de progreso, rate limiting, normalización de video.
- **Integración**: repositorios contra `mongodb-memory-server` (setup en `src/server/repositories/__tests__/setup.ts`), incluyendo aislamiento de tenant, flujos E2E completos, visibilidad de contenido y partial-update.
- Pruebas clave en: `src/server/services/__tests__/` y `src/server/repositories/__tests__/`.

```bash
npm run test
```

> Los tests de integración fijan `MONGODB_URI` a un Mongo en memoria y crean el schema con `bootstrapSchema`, reutilizando la misma fuente de verdad que la base real.

---

## 17. Migraciones y performance

El archivo **`MIGRATIONS.md`** registra:

1. **Notas de performance** con mediciones (`explain()`) que motivaron o descartaron índices.
2. **Migraciones manuales** aplicadas sobre Atlas existente (no reproducibles con `db:bootstrap` sobre una base vieja) — `ensureCollection` nunca modifica el validador ni dropea índices de una colección existente.
3. **Verificación**: un `npm run db:bootstrap` contra una base nueva y vacía reproduce el estado final correcto sin pasos manuales.

> Importante: `db:bootstrap` crea lo que falta pero **no** altera colecciones existentes. Para bases con historia previa se requiere aplicar las migraciones manuales de `MIGRATIONS.md`.

---

## 18. Backlog y features diferidas

El archivo **`BACKLOG.md`** lista features explícitamente diferidas (decisión de Product Owner, no deuda técnica). Incluye:

- **Fase 6 (visual)**: formulario "conocé al equipo" con notas por líder; variante de quiz "completar la frase".
- **Fase 2**: revocar/reenviar invitación, promover usuario a admin.
- **Fase 3B (media)**: client-direct-upload a Vercel Blob; `BLOB_READ_WRITE_TOKEN` no configurado en dev.
- **Plataforma**: rate limiting solo en login/accept-invite; observabilidad externa (Sentry) no configurada.

> No implementar sin aprobación explícita, ya que cada item es un cambio de alcance funcional (PRD §59).

---

## 19. Documentación relacionada

| Archivo | Descripción |
|---------|-------------|
| `PRD — Plataforma Multi-Tenant de Onboarding Operativo Imagine Apps.md` | Especificación funcional y técnica completa del producto. |
| `README.md` | Punto de entrada resumido del proyecto. |
| `MIGRATIONS.md` | Migraciones de base de datos y notas de performance. |
| `BACKLOG.md` | Features diferidas con aprobación de Product Owner. |
| `CLAUDE.md` / `AGENTS.md` | Instrucciones/reglas para agentes de IA (incluye convenciones de Next.js 16). |
| `src/server/db/schema.ts` | Fuente única de verdad del schema de MongoDB (colecciones, validadores, índices). |
| `src/types/enums.ts` | Enums y tipos de dominio del sistema. |
