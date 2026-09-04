# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

SaaS multi-tenant onboarding platform (Spanish UI/docs). Next.js 16 (App Router, Turbopack) + TypeScript (strict) + MongoDB + NextAuth v5 + Zod 4 + Tailwind CSS 4. Full architecture, data model, auth flow, roles, security model, and API reference live in **`DOCUMENTATION.md`** — read it before making non-trivial changes; this file only adds what that doc doesn't cover for day-to-day work.

## Commands

```bash
npm run dev              # Dev server (Next.js + Turbopack)
npm run build            # Production build
npm run lint             # ESLint (eslint-config-next)
npm run test             # Run all tests (Vitest)
npx vitest run path/to/file.test.ts             # Run a single test file
npx vitest run -t "test name substring"         # Run tests matching a name
npm run db:bootstrap     # Create Mongo collections + $jsonSchema validators + indexes (idempotent, additive only)
npm run db:seed          # Seed tenant, functional roles, and bootstrap users (idempotent)
npm run db:verify        # Verify an existing database's validation
```

There is no typecheck script; `tsc` runs implicitly via `next build`/editor. Env vars come from `.env.local` (copy from `.env.example`); `src/server/config/env.ts` reads them lazily.

## Architecture (see DOCUMENTATION.md §6-8 for full detail)

Strict layering, one direction only:

```text
app/api/** (Route Handlers: Zod validation, requireAdmin()/requireActiveUser(), toErrorResponse)
  → server/services/** (business rules, tenant-membership checks, audit logging)
    → server/repositories/** (only layer touching MongoDB; every query scoped by tenantId)
      → MongoDB (validators + indexes defined once in server/db/schema.ts)
```

- Server Components by default under `src/app`; `'use client'` only where there's real interactivity.
- `src/server/db/schema.ts` is the single source of truth for Mongo validators/indexes — shared by `db:bootstrap` and the integration-test setup (`src/server/repositories/__tests__/setup.ts`, via `mongodb-memory-server`).
- Route groups: `(admin)` (protected admin panel), `(public)` (login, accept-invite), `(user)` (the onboarding experience).
- Media storage is behind a provider interface (`src/server/media/provider.ts`) injected into `media.service` — never call Vercel Blob directly from a service.

## Conventions specific to this repo

- **Tenant isolation is non-negotiable**: every repository filter includes `tenantId`. Services validate that any referenced entity (stage, role, media, process) belongs to the actor's tenant (`assertStageBelongsToTenant`, `assertRoleIdsBelongToTenant`, etc.) before use. Cross-tenant and nonexistent resources both surface as `NotFoundError` — never `ForbiddenError` — so a request can't distinguish "not yours" from "doesn't exist."
- **Auth guards read fresh from Mongo, not the JWT**: `requireActiveUser()` / `requireAdmin()` / `requireContentEditor()` (`src/server/auth/session.ts`) re-check `status`/`platformRole`/`functionalRoleId` from the DB on every protected request, so deactivation/role changes take effect immediately. `requireContentEditor()` also lets `EDITOR` through (ADMIN or EDITOR) — used only by the non-destructive routes/pages of content/leaders/processes/steps; everything else (including archive/delete/reactivate on those same resources) stays on `requireAdmin()`. `src/proxy.ts` only does an optimistic "is there a JWT" check for UX redirects — it is not a security boundary; don't rely on it for authorization.
- **Content lifecycle** is `DRAFT → PUBLISHED → ARCHIVED`, enforced by `assertValidTransition` (see `src/lib/content-status.ts`) for routes/stages/content items/leaders/processes/steps alike. `ARCHIVED` can be reactivated back to `DRAFT` (never straight to `PUBLISHED` — an admin must republish explicitly), via each entity's `reactivate*` service + `POST .../reactivate` route. Visibility cascades: Route `PUBLISHED` → Stage `PUBLISHED` → Item/Process `PUBLISHED` + matching `scope`/`roleIds`. Breaking any link in that chain hides the content (`resolveVisibleContent`/`resolveVisibleProcesses`/`resolveVisibleSteps`).
- **Progress is derived, never stored as a percentage.** `user_progress` uses a polymorphic reference (`targetType`: `STEP` | `CONTENT_ITEM` | `STAGE`); a document's existence *is* the completed fact — there are no `PENDING`/`IN_PROGRESS` states. Core logic: `src/server/services/progress-derivation.ts` + `progress.service.ts` (self-healing `resolveJourney`/`resolveJourneyFor`).
- **`onboarding_routes` is a tenant singleton** (unique index on `{tenantId}` alone) — one route per tenant, not per functional role; role-specific content lives in `scope`/`roleIds` on items/leaders/processes, not in route structure. Its editable headline/subtitle and the two toggle-able guide messages (blocked-next / pending-content) are managed from `/admin/messages`, not `/admin/modules` (see `route.service.getRouteContent`).
- **Quiz gate**: a content item whose title matches `isQuizContent` (see `src/lib/institutional-content.ts`) is rendered as a `QuizBlock` and gates the "next module" action in `OnboardingJourney.tsx` — all of its questions must be answered (correctness doesn't matter) before the advance button enables. Purely client-side; answers are never persisted to `user_progress`.
- **Invitations**: the raw token is shown once; only its SHA-256 hash is persisted (`src/lib/token.ts`). Functional role is always assigned via the invitation, never chosen by the user; an `ADMIN` invitation must have `functionalRoleId: null`.
- **Video embeds**: URLs must pass the YouTube/Vimeo/Loom allowlist in `src/lib/video-url.ts` before rendering — never render a raw URL in an `<iframe>`.
- **Error handling**: throw domain errors from `src/server/errors/index.ts` (`AppError`, `NotFoundError`, `ForbiddenError`, `UnauthorizedError`, `ValidationError`, `RateLimitedError`) in services; let route handlers convert via `toErrorResponse()`. Never leak stack traces/query details in a response — unexpected errors collapse to `INTERNAL_ERROR` (500).
- **Zod schemas** for every entity live in `src/server/validation/*` and are the API-edge validation; MongoDB's `$jsonSchema` validators in `schema.ts` are defense-in-depth behind them, not a substitute.

## Database migrations

`db:bootstrap` only creates what's missing — it never alters an existing collection's validator or drops its indexes. Any schema change that needs to apply to a pre-existing Atlas database (not just a fresh one) requires a manual migration recorded in **`MIGRATIONS.md`**, alongside performance notes backed by `explain()` measurements. Read that file before changing `schema.ts` if the change affects a collection likely to already have data.

## Working within scope

**`BACKLOG.md`** lists features explicitly deferred by product-owner decision (invitation revoke/resend, client-direct-upload to Blob, a notes form for "conocé al equipo", a fill-in-the-blank quiz variant, broader rate limiting/observability). Treat these as out of scope unless the user explicitly asks for one — don't implement them opportunistically while touching nearby code.

The PRD (`PRD — Plataforma Multi-Tenant de Onboarding Operativo Imagine Apps.md`) is the full functional/technical spec; its guiding priority order is **Simplicity → Security → Maintainability → Performance → Scalability**. This is a deliberately simple monolith (no microservices, no Redis/Kafka/workers, no external cache) — don't introduce that kind of infrastructure without it being explicitly requested.
