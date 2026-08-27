# Imagine Apps — Plataforma Multi-Tenant de Onboarding Operativo

Aplicación web **SaaS multi-tenant** para gestionar el proceso de incorporación, adaptación y aprendizaje operativo de los nuevos integrantes de una organización, con panel administrativo para gestionar el contenido y una experiencia de onboarding guiada por rol.

Construida con **Next.js 16 (App Router) + TypeScript + MongoDB + Tailwind CSS**.

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 / React / Turbopack |
| Lenguaje | TypeScript 5 (strict) |
| Base de datos | MongoDB + `mongodb-memory-server` (tests) |
| Auth | NextAuth v5 (credentials, JWT) |
| Validación | Zod 4 |
| Estilos | Tailwind CSS 4 |
| Media | Vercel Blob |
| Testing | Vitest |

## Inicio rápido

```bash
npm install

# 1. Configurá las variables de entorno (copiá .env.example a .env.local)
# 2. Inicializá la base de datos (idempotente)
npm run db:bootstrap
npm run db:seed

# 3. Levantá el servidor
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run start            # Servidor de producción
npm run lint             # ESLint
npm run db:bootstrap     # Crea colecciones + índices + validadores en MongoDB
npm run db:seed          # Siembra tenant, roles y usuarios de arranque
npm run db:verify        # Verifica la validación de una base existente
npm run test             # Tests (Vitest)
```

## Documentación

▶️ **La documentación completa del proyecto está en [`DOCUMENTATION.md`](DOCUMENTATION.md)** — cubre arquitectura, modelo de datos, autenticación, roles, seguridad, API, errores, testing, migraciones y backlog.

Otros documentos:

| Documento | Descripción |
|-----------|-------------|
| [`DOCUMENTATION.md`](DOCUMENTATION.md) | Documentación técnica principal del proyecto. |
| `PRD — Plataforma Multi-Tenant de Onboarding Operativo Imagine Apps.md` | Especificación funcional y técnica completa. |
| [`MIGRATIONS.md`](MIGRATIONS.md) | Migraciones de base de datos y notas de performance. |
| [`BACKLOG.md`](BACKLOG.md) | Features diferidas con aprobación de Product Owner. |

