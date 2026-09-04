---
name: "Project Overview - Imagine Apps Onboarding Platform"
description: "Guia operativa condensada del proyecto para agentes de IA (Next.js, MongoDB, arquitectura y convenciones)"
alwaysApply: true
---

# CONTINUE.md — Imagine Apps Onboarding Platform

> **Purpose**: This file is the primary project guide for AI agents (and humans) working in this codebase. It is loaded automatically by Continue when working in this repository. Always read `DOCUMENTATION.md` (root) for the authoritative, exhaustive technical reference; this file is the condensed operational playbook.

---

## 1. Project Overview

### Purpose
Imagine Apps Onboarding Platform is a **SaaS multi-tenant web application** that guides new organizational members through their operational onboarding. Each new member learns about the organization (mission/vision/culture), its leaders, its "non-negotiable" principles, and the specific processes needed to perform their role. All content is editable by administrators without involving the development team.

### Key Technologies
| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16.3.1 (App Router, Turbopack, Server Components) |
| **Language** | TypeScript 5 (strict mode) |
| **Database** | MongoDB (Atlas in prod; `mongodb-memory-server` in tests) |
| **Auth** | NextAuth v5 (Credentials provider, JWT sessions, 8h expiry) |
| **Validation** | Zod 4 |
| **Hashing** | bcryptjs (cost 12) |
| **Media/Storage** | Vercel Blob (`@vercel/blob`) |
| **Styling** | Tailwind CSS 4 |
| **Testing** | Vitest 4 |
| **Lint** | ESLint 9 (`eslint-config-next`) |
| **Deploy** | Vercel |

### High-Level Architecture
Layered architecture with clear separation of concerns, running under Next.js Server Components:

```
Browser
   ↓
Next.js (UI Components / Server Components)
   ↓
Route Handlers (API)          →  src/app/api/**
   ↓
Services (business logic)     →  src/server/services/**
   ↓
Repositories (data access)     →  src/server/repositories/**
   ↓
MongoDB
```

**Design principles** (PRD §68): modular monolith (no microservices), stateless (state lives in MongoDB, not memory), no external cache (native Next.js revalidation + Mongo indexes), **1 account = 1 tenant** (login without tenant selection).

### ⚠️ IMPORTANT — This is NOT the Next.js you know
This project uses **Next.js 16** which has breaking changes vs older versions you may know. **Read the relevant guides in `node_modules/next/dist/docs/` before writing any code.** Heed deprecation notices. This is enforced via the agent-rules block in `AGENTS.md` / `CLAUDE.md`.

---

## 2. Getting Started

### Prerequisites
- **Node.js** `20.19.0` (see `.nvmrc`)
- A **MongoDB Atlas** instance (or local `mongod`)
- Optional: a **Vercel Blob** store for image uploads (needs `BLOB_READ_WRITE_TOKEN`)

### Installation
```bash
npm install

# 1. Copy .env.example to .env.local and fill required variables (see below)

# 2. Bootstrap the database (idempotent: creates collections, indexes, validators)
npm run db:bootstrap

# 3. Seed tenant + roles + admin (+ optional realistic content)
npm run db:seed
npm run db:seed:content

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables
| Variable | Required | Description |
|----------|:--------:|-------------|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `AUTH_SECRET` | ✅ | NextAuth JWT signing secret |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public app URL |
| `BLOB_READ_WRITE_TOKEN` | ⚠️ | Vercel Blob token (image uploads only) |
| `SEED_*_EMAIL` / `SEED_*_PASSWORD` | ⚠️ | Seed admin/user credentials (only used by `db:seed`) |

> Env vars are read lazily in `src/server/config/env.ts` (never computed at import time), so tests can set `MONGODB_URI` to in-memory Mongo after other modules import.

### Running Tests
```bash
npm run test        # Vitest (unit + integration)
```
Integration tests use `mongodb-memory-server` and reuse `bootstrapSchema` (same schema source of truth as the real DB).

### Scripts
| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server (Next.js + Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:bootstrap` | Create collections + indexes + Mongo validators (idempotent) |
| `npm run db:seed` | Seed tenant, roles, users |
| `npm run db:seed:content` | Seed onboarding content via services |
| `npm run db:verify` | Verify existing DB validation |
| `npm run test` | Run Vitest |

---
## 3. Project Structure

```
src/
├── app/                          # Routes & pages (App Router)
│   ├── (admin)/                  # Admin panel (protected)
│   │   └── admin/
│   │       ├── modules/           # Route + stages + content + processes, per-module
│   │       ├── processes/[id]/    # Steps of a process
│   │       ├── leaders/           # Leaders management
│   │       ├── messages/          # Route headline/subtitle + editable guide messages
│   │       ├── users/             # Users + invitations
│   │       └── audit/             # Audit log
│   ├── (public)/                 # Public routes
│   │   ├── login/
│   │   └── accept-invite/[token]/
│   ├── (user)/                   # Onboarding experience
│   │   └── onboarding/
│   │       ├── page.tsx          # Complete journey
│   │       └── leaders/          # "Conoce a tu equipo"
│   ├── api/                      # Route Handlers (REST) — see §6
│   └── layout.tsx / globals.css / page.tsx
├── components/                   # Reusable components
│   ├── admin/                    # Admin form/action components
│   └── ... UI primitives (Button, Card, Badge, Modal, Toast, DataTable, ...)
├── lib/                          # Helpers (cn, slug, email, token, video-url, logger, ...)
├── server/                       # Backend
│   ├── auth/                     # NextAuth + session guards
│   ├── config/env.ts             # Typed environment variables
│   ├── db/                       # Mongo client + schema
│   ├── errors/                   # Domain errors + HTTP handler
│   ├── media/                    # Storage provider (contract + impl)
│   ├── repositories/             # Data-access layer
│   ├── services/                 # Business logic
│   └── validation/               # Zod schemas per entity
├── types/                        # Shared types & enums (enums.ts)
└── proxy.ts                      # Auth proxy (optimistic check)
```

**Key root files**: `DOCUMENTATION.md` (authoritative reference), `MIGRATIONS.md` (DB migrations + performance notes), `BACKLOG.md` (deferred features), `PRD — Plataforma Multi-Tenant de Onboarding Operativo Imagine Apps.md` (product spec), `scripts/` (CLI tools).

---

## 4. Development Workflow

### Coding Standards / Conventions
- **Server-first**: all components are Server Components by default. Use `'use client'` ONLY where interactivity is needed (state, events, hooks).
- **Architecture constraints**:
  - `src/server/repositories/**` is the ONLY layer that touches MongoDB.
  - Every repository query is scoped by `tenantId` (never in frontend).
  - Services validate tenant ownership of references (`assertStageBelongsToTenant`, etc.).
  - Cross-tenant resources return `NotFoundError`, NEVER `ForbiddenError` (don't confirm another tenant's data exists).
- **Unidirectional dependency**: Route Handlers → Services → Repositories → MongoDB. Never the reverse.
- **Single source of truth for Mongo schema**: `src/server/db/schema.ts` (validators + indexes). Never duplicate.
- **Zod validation at the API edge**: each entity has a Zod schema in `src/server/validation/*`, validated before services. Defense-in-depth with Mongo `$jsonSchema` validators.
- **Design tokens**: all colors/radii/shadows come from `src/app/globals.css` `@theme` tokens (brand/ink/paper/line/success/danger). Never hardcode literal colors.
- **Path alias**: `@/*` → `src/*` (configured in `tsconfig.json` and `vitest.config.ts`).
- **Email normalization**: always via `normalizeEmail` in `src/lib/email.ts` (never disperse trim/lowercase).
- **Invitation tokens**: raw token only ever returned in the invite link; the DB stores only its SHA-256 hash (see `src/lib/token.ts`).
- **Video URLs**: always passed through `normalizeVideoUrl` (`src/lib/video-url.ts`) against a strict YouTube/Vimeo/Loom/Google Drive allowlist. Only canonical embed URLs are stored/rendered (mitigates XSS).

### Testing Approach
- **Vitest** (`vitest.config.ts`).
- **Unit tests**: business rules, validations, progress derivation, rate limiting, video URL normalization.
- **Integration tests**: repositories against `mongodb-memory-server` (setup in `src/server/repositories/__tests__/setup.ts`), covering tenant isolation, full E2E flows, content visibility, partial-update preservation.
- Key tests: `src/server/services/__tests__/` and `src/server/repositories/__tests__/`.

### Build & Deployment
- **Local build**: `npm run build` then `npm run start`.
- **Deploy**: Vercel (serverless).
- **Database setup** in a new environment: run `npm run db:bootstrap` + `npm run db:seed`.
- **⚠️ Important**: `db:bootstrap` creates what's missing but does NOT modify existing collections (never drops/modifies validators or indexes). For pre-existing/historical DBs, apply manual migrations from `MIGRATIONS.md` first.

### Contribution Guidelines
- **Follow the PRD**: each feature must align with `PRD — Plataforma Multi-Tenant de Onboarding Operativo Imagine Apps.md`.
- **Check `BACKLOG.md`**: features explicitly deferred (decision of Product Owner, not tech debt). Do NOT implement backlog items without explicit approval.
- Run `npm run tsc --noEmit` and `npm run lint` before committing.

---
## 5. Key Concepts

### Domain Terminology
| Term | Meaning |
|------|---------|
| Tenant | An organization. All data is isolated per tenant. 1 account = 1 tenant. |
| Route | The onboarding backbone (singleton per tenant), made of ordered stages the user completes one at a time. |
| Stage | An ordered step in the Route, with optional dependencies (`dependsOnStageId` + `isBlocking`). Contains content items and processes. |
| Content Item | Readable content of type TEXT/VIDEO/IMAGE/MIXED, with requirement OBLIGATORY (read acknowledgment, blocks advance) or INFORMATIONAL (passive scroll-view, never blocks). Scoped COMMON or ROLE. A title matching `isQuizContent` renders as a `QuizBlock` instead and gates "next module" until all its questions are answered (client-side only, not persisted). |
| Process | An operational workflow (with ordered steps). Scoped COMMON or ROLE (`roleIds[]`). |
| Step | A single step within a process (title, instruction, completion criteria, optional video). |
| Leader | A team leader. Scoped COMMON or ROLE (with `roleIds[]`). |
| Functional Role | Determines onboarding type (initial: `PDM`, `UX_UI_DESIGNER`). Assigned ALWAYS from invitation, never chosen by user. |
| Platform Role | `USER` or `ADMIN`. `ADMIN` has no functional role. |
| Progress | NOT stored as a percentage — *derived* from `user_progress` records. Existence of the record = the "completed" fact (no intermediate states). |

### Content Lifecycle
`DRAFT → PUBLISHED → ARCHIVED` (validated in `src/lib/content-status.ts`) for route/stage/content/leader/process/step alike — including the singleton route. `ARCHIVED` is not terminal: each entity's `reactivate*` service (+ `POST .../reactivate`) returns it to `DRAFT`, never directly to `PUBLISHED`. Publishing is always explicit.

### Visibility Cascade
Content visibility follows: Route `PUBLISHED` → Stage `PUBLISHED` → Item/Process `PUBLISHED` **with matching scope/role**. If any link is broken, content is hidden (`resolveVisibleContent`, `resolveVisibleProcesses`, `resolveVisibleSteps`).

### Design Patterns
- **Repository pattern**: typed repositories with a `collection()` helper and Mongo documents as typed objects.
- **Service orchestration**: services call repositories, validate ownership, apply rules, and record audit.
- **Dependency injection**: `MediaProvider` injected into `media.service` (allows swapping storage providers).
- **Domain errors**: `AppError` hierarchy in `src/server/errors/index.ts`, translated centrally via `toErrorResponse()` in `src/server/errors/handler.ts`. Never expose internals in responses.
- **Singleton route**: lazy-created via atomic upsert (`route.repository.getOrCreate`) with unique `{tenantId}` index.
- **Polymorphic progress reference**: `user_progress.targetType` (STEP/CONTENT_ITEM/STAGE) with a unique index for idempotent upsert.
- **Cache-per-request**: `requireActiveUser`, `resolveJourney`, etc. use React's `cache()` to dedupe reads within a render pass.

### Auth & Session
- JWT only stores identity (`userId`, `tenantId`) — signed and trustworthy but potentially stale over its 8h life.
- **Authority (status/role) ALWAYS comes from a real Mongo read** via `requireActiveUser()`/`requireAdmin()` per request, so deactivation/role-changes take effect immediately.
- `src/proxy.ts` does an **optimistic** JWT-existence check only for UX redirects — NOT the real security boundary.
- **Audit logging**: 28 administrative actions recorded to `audit_logs` (see `src/server/repositories/audit.repository.ts`).
- **Rate limiting** on `/login` (by email + IP) and `/accept-invite` (by token).

---
## 6. Common Tasks

### Adding a New Feature (following Clean Architecture)
1. **Extend types** in `src/types/` (enums/domain types).
2. **Validation**: add/extend Zod schemas in `src/server/validation/`.
3. **Repository**: add data-access method in `src/server/repositories/<entity>.repository.ts` (scope by tenantId).
4. **Service**: orchestrate business rules in `src/server/services/<entity>.service.ts` (validate ownership, audit).
5. **Route Handler**: add `src/app/api/<entity>/route.ts` + `[id]/route.ts` (+ lifecycle actions like `/publish`, `/archive`, `/reactivate`). Validate with Zod at the edge.
6. **UI**: build Server Component page (or client component with `'use client'`) in `src/app`.
7. Connect to existing views; ensure `requireAdmin()`/`requireActiveUser()` guards are used.

### Managing Content Lifecycle (publish/archive/reactivate) in Admin
Each manageable resource (route, stage, content, process, step, leader) has a consistent action pattern:
- `POST /api/{resource}/{id}/publish`
- `POST /api/{resource}/{id}/archive`
- `POST /api/{resource}/{id}/reactivate`
- `DELETE /api/{resource}/{id}` (where permanent delete is supported)

The admin UI uses the shared hook `useResourceActions(basePath)` (`src/lib/admin/useResourceActions.ts`) which centralizes fetch + `isPending`/`error` + `router.refresh()`.

### Viewing/Administering Content by Module
The admin panel is organized **by module (stage)** under `/admin/modules` — each stage groups its content items + processes. Steps are managed under `/admin/processes/[id]`.

### Adding a Functional Role
1. Insert a new row in the `roles` collection (`key`, `label`, tenant-scoped, unique `{tenantId, key}`).
2. Assign it to users **via invitation** (or admin user edit at `PATCH /api/users/{id}/role`).
3. Seed/scoped content (`scope: ROLE` + `roleIds[]`) will appear for users of that role through `findVisibleForRole`.

---

## 7. Troubleshooting

### Common Issues
- **`db:bootstrap` doesn't update existing collections**: by design. For pre-existing DBs, apply manual migrations from `MIGRATIONS.md`.
- **Admin actions don't take effect immediately**: authority (status/role) is read from Mongo per request — if it seems stale, check the user's actual document in the `users` collection.
- **Content not visible to a user**: check the visibility cascade — Route/Stage/Item `PUBLISHED` status + matching `scope`/`roleIds`. Check `resolveVisibleContent`/`resolveVisibleProcesses`/`resolveVisibleSteps`.
- **Video not rendering**: video URLs are normalized through `normalizeVideoUrl` (`src/lib/video-url.ts`) against a strict allowlist (YouTube/Vimeo/Loom/Google Drive). Only canonical embed URLs are stored/rendered. Thumbnails only exist for YouTube and Google Drive.
- **Media upload fails**: `BLOB_READ_WRITE_TOKEN` may be missing, or the file exceeds the 4MB serverless upload limit. See the deploy-blocking note at the top of `src/server/services/media.service.ts`.
- **`MONGODB_URI` missing at runtime**: env vars are read lazily in `src/server/config/env.ts`; they are only checked at first actual use (so tests can set the value first).

### Debugging Tips
- **Structured logs**: the `logger` (`src/lib/logger.ts`) outputs JSON lines `{level, event, timestamp, ...}`. Use `logger.info/warn/error("event_name", { ... })`.
- **API errors** come back as `{ success: false, error: { code, message } }` — codes: `NOT_FOUND`, `FORBIDDEN`, `UNAUTHORIZED`, `VALIDATION_ERROR`, `RATE_LIMITED`, `INTERNAL_ERROR` (see `src/server/errors/index.ts`).
- **Untracked/unexpected errors** collapse to `INTERNAL_ERROR` (500) with detail only in the server log — never in the response.
- **Check query scoping**: a bug where a user sees another tenant's data usually means a missing `tenantId` filter in a repository or a `findById` without tenant scoping.
- **Run `npm run test`** for integration tests that cover tenant isolation and content visibility.
