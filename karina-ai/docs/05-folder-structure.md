# 5. Folder Structure

The project lives in `karina-ai/` and is fully self-contained (it does not touch
the parent repository's existing website).

```
karina-ai/
├── README.md                     Project overview + deliverables index
├── package.json                  Scripts & dependencies
├── tsconfig.json                 TypeScript (strict) + "@/*" path alias
├── next.config.mjs               Next.js configuration
├── postcss.config.mjs            PostCSS (Tailwind + Autoprefixer)
├── tailwind.config.ts            Design system → Tailwind theme
├── .env.example                  Documented environment seams (by phase)
├── .gitignore
├── .node-version                 Node 18.17
│
├── docs/                         Phase 1 deliverables (this documentation)
│   ├── 01-site-architecture.md
│   ├── 02-component-hierarchy.md
│   ├── 03-design-system.md
│   ├── 04-technical-architecture.md
│   ├── 05-folder-structure.md
│   ├── 06-database-entities.md
│   └── 07-ai-integration-plan.md
│
├── prisma/
│   └── schema.prisma             Data model (defined; not yet migrated)
│
├── public/                       Static assets (empty in Phase 1 — no fake media)
│
└── src/
    ├── app/                      App Router — routes = sections
    │   ├── layout.tsx            Root layout (fonts, header/footer, launcher)
    │   ├── globals.css           Design tokens + base styles
    │   ├── page.tsx              Home
    │   ├── not-found.tsx         404
    │   ├── meet-karina/page.tsx
    │   ├── ai-assistant/page.tsx
    │   ├── training/page.tsx
    │   ├── technology/page.tsx
    │   ├── partners/page.tsx
    │   ├── media/page.tsx
    │   └── contact/page.tsx
    │
    ├── components/
    │   ├── layout/               Container, SiteHeader, SiteFooter, PageHeader
    │   ├── ui/                    Button, Section, Eyebrow, SectionHeading,
    │   │                         GlassPanel, AiBadge, RoadmapNote
    │   ├── sections/             Hero, CapabilitiesPreview, AudienceGrid, CtaBand
    │   └── chat/                 AssistantLauncher (AI seam)
    │
    ├── lib/
    │   ├── site.ts               Site identity, navigation, structured content
    │   ├── cn.ts                 className helper
    │   └── design/
    │       └── tokens.ts         Design tokens (source of truth)
    │
    └── types/
        └── index.ts              Shared TypeScript types
```

## Planned additions (Phase 2+)

Introduced only when their capability is built, keeping the tree honest:

```
src/
├── app/
│   ├── (marketing)/…             Optional route group for public pages
│   ├── account/…                 Auth-gated dashboard            (Phase 5)
│   ├── learn/…                   Course player                   (Phase 5)
│   ├── org/…                     Organization admin              (Phase 5)
│   ├── api/
│   │   ├── chat/route.ts         Streaming AI endpoint           (Phase 3)
│   │   ├── contact/route.ts      Contact submissions             (Phase 2)
│   │   └── webhooks/…            Payments / provider webhooks    (Phase 6)
│   ├── sitemap.ts · robots.ts    SEO                             (Phase 2)
│   └── privacy · terms           Legal pages                     (Phase 2)
├── lib/
│   ├── db.ts                     Prisma client singleton         (Phase 2)
│   ├── ai/                       Claude client, retrieval, prompts (Phase 3)
│   ├── auth/                     Session/auth helpers            (Phase 5)
│   └── payments/                 Billing client                  (Phase 6)
├── server/                       Server actions / services       (Phase 2+)
└── content/                      MDX/blog sources (or CMS)        (Phase 7)
```

## Conventions

- **Path alias:** import from `@/…` (maps to `src/`).
- **Colocation:** page-specific pieces stay near their route; shared pieces live
  in `components/` and `lib/`.
- **One seam per service:** each external integration gets a single module in
  `lib/` so providers are swappable.
