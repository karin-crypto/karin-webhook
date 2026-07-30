# 4. Technical Architecture

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 14 (App Router)** | Server components, streaming, edge-ready, great DX — supports fast, global delivery and future AI streaming |
| Language | **TypeScript (strict)** | Safety across a growing platform |
| UI | **React 18** | Server-first components + selective client islands |
| Styling | **Tailwind CSS** | Token-driven, theme-aware, zero-runtime |
| Fonts | **next/font** (Sora, Inter) | Self-hosted, no layout shift |
| Data | **Prisma + PostgreSQL** | Typed data model; relational fit for accounts, courses, billing |
| AI core | **Anthropic Claude** (planned) | Reasoning core behind KARINA |
| Retrieval | **Vector DB** (planned) | Grounded, sourced answers |

## Rendering strategy

- **Static-first** for marketing/content routes (Home, sections, blog) →
  fast, cacheable, global via CDN/edge.
- **Dynamic / streaming** for AI and authenticated app routes (chat, dashboard).
- **Server Components** by default; **Client Components** only for interactive
  islands (mobile menu, theme toggle, chat widget) → minimal client JS.

## High-level system diagram

```
        ┌──────────────────────────────────────────────────┐
        │                    Browser                         │
        │   Next.js App Router UI · Client islands           │
        └───────────────┬───────────────────────┬───────────┘
                        │ HTML/RSC              │ fetch / stream
                        ▼                       ▼
        ┌───────────────────────────┐  ┌──────────────────────┐
        │  Next.js server / edge    │  │   API routes /        │
        │  (RSC, server actions)    │  │   server actions      │
        └───────┬───────────┬───────┘  └─────┬──────────┬──────┘
                │           │                │          │
                ▼           ▼                ▼          ▼
        ┌────────────┐ ┌──────────┐  ┌────────────┐ ┌──────────┐
        │ PostgreSQL │ │ Vector DB│  │  Claude    │ │ Payments │
        │ (Prisma)   │ │ (KB)     │  │  (reason)  │ │ provider │
        └────────────┘ └──────────┘  └────────────┘ └──────────┘
                                          │
                              ┌───────────┴───────────┐
                              ▼                       ▼
                        ┌──────────┐            ┌──────────┐
                        │  Voice   │            │  Avatar  │
                        │ STT/TTS  │            │  stream  │
                        └──────────┘            └──────────┘
```

## Layering & boundaries

- **UI layer** (`components/`, `app/`) — presentation only.
- **Domain/config** (`lib/`) — site config, design tokens, helpers; later,
  service clients (AI, DB, payments) behind small typed modules.
- **Data layer** (`prisma/`) — schema + generated client; accessed only from
  server code (route handlers / server actions), never the client.
- **Integration seams** — every external service is reached through a single
  module so providers can be swapped without touching the UI.

## Environment & configuration

- All secrets/config via environment variables — documented in
  [`.env.example`](../.env.example), grouped by the phase that introduces them.
- No secret is ever exposed to the client except explicitly `NEXT_PUBLIC_*`
  values.

## Performance budget (targets)

- Lighthouse performance ≥ 90 on mobile; LCP < 2.5s on 4G.
- Ship minimal client JS (server components + islands).
- Fonts self-hosted with `swap`; images optimized via `next/image` (Phase 2).

## Security & privacy posture

- Privacy by design: collect the minimum; keep users in control (see doc 6).
- Server-only data access; input validation at every route/action boundary.
- CSRF-safe server actions; rate limiting on AI + contact endpoints (Phase 2).
- `poweredByHeader` disabled; security headers added in Phase 2.

## Tooling & quality

- `typecheck` (tsc), `lint` (eslint-config-next), `format` (prettier).
- Testing (Phase 2): unit (Vitest) + E2E (Playwright — already available in the
  environment).

## Deployment (planned)

- Edge/CDN-fronted Node runtime (e.g. Vercel or a container platform).
- Preview deployments per branch; production behind the primary domain.
- Managed PostgreSQL + managed vector store.
