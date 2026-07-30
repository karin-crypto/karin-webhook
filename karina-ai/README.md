# KARINA AI

An AI-powered maritime safety platform built around **KARINA**, an AI maritime
safety character designed to educate, interact with users, and provide training
experiences.

> KARINA is always presented clearly as an **AI character**. This is a
> technology platform — not a marketing website.

This repository directory (`karina-ai/`) is a **standalone project**. It does
not modify or depend on the existing website in the parent repository.

---

## Status: Phase 1 — Foundation ✅

Phase 1 delivers the **project foundation only** — architecture, design system,
scaffolding, and the data model. There is **no placeholder content, no fake
testimonials, no fake certifications, and no invented statistics**. Sections
that require future services are transparently marked as roadmap items in the
UI rather than filled with fake content.

**Phase 2 is not started.** Implementation of live features awaits approval.

## Phase 1 deliverables

| # | Deliverable | Where |
|---|-------------|-------|
| 1 | Site architecture | [`docs/01-site-architecture.md`](docs/01-site-architecture.md) |
| 2 | Component hierarchy | [`docs/02-component-hierarchy.md`](docs/02-component-hierarchy.md) |
| 3 | Design system | [`docs/03-design-system.md`](docs/03-design-system.md) |
| 4 | Technical architecture | [`docs/04-technical-architecture.md`](docs/04-technical-architecture.md) |
| 5 | Folder structure | [`docs/05-folder-structure.md`](docs/05-folder-structure.md) |
| 6 | Database entities | [`docs/06-database-entities.md`](docs/06-database-entities.md) + [`prisma/schema.prisma`](prisma/schema.prisma) |
| 7 | Future AI integration plan | [`docs/07-ai-integration-plan.md`](docs/07-ai-integration-plan.md) |

## Sections (information architecture)

`Home` · `Meet KARINA` · `AI Assistant` · `Training` · `Technology` ·
`Partners` · `Media` · `Contact`

## Tech stack

- **Framework:** Next.js 14 (App Router) + React 18 + TypeScript
- **Styling:** Tailwind CSS with a token-driven, theme-aware design system
- **Fonts:** Sora (display) + Inter (body) via `next/font`
- **Data model:** Prisma + PostgreSQL (defined, not yet migrated)
- **AI (planned):** Anthropic Claude reasoning core, retrieval-grounded
  knowledge base, with chat → voice → avatar layered on top

## Local development

```bash
cd karina-ai
cp .env.example .env.local   # fill in as capabilities are enabled
npm install
npm run dev                  # http://localhost:3000
```

Useful scripts: `npm run build`, `npm run typecheck`, `npm run lint`,
`npm run db:generate`.

## Design principles

Luxury technology · minimalistic · modern · fast · global · high accessibility ·
excellent mobile experience · ocean-inspired palette · glass effects only where
appropriate.

## Prepared integration seams

The foundation reserves clean seams for: AI chat, voice conversation, video
avatar, user accounts, memberships, online payments, knowledge base, course
platform, blog, analytics, and CRM. See
[`docs/07-ai-integration-plan.md`](docs/07-ai-integration-plan.md) and
[`.env.example`](.env.example).
