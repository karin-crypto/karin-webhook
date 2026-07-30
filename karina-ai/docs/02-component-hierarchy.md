# 2. Component Hierarchy

Components follow a small, layered system: **primitives → composed UI → layout →
sections → pages**. Everything is a React Server Component by default;
interactivity is added as isolated client "islands" only where needed.

## Layers

```
Primitives (ui/)        Small, reusable, presentational
  ├── Button / ButtonButton
  ├── Section            vertical rhythm wrapper
  ├── Eyebrow            uppercase label
  ├── SectionHeading     eyebrow + title + intro
  ├── GlassPanel         glass surface (used sparingly)
  ├── AiBadge            "AI character" signal
  └── RoadmapNote        honest marker for future-phase features

Layout (layout/)        Structure & chrome
  ├── Container          centered max-width column
  ├── SiteHeader         global nav (sticky, glass)
  ├── SiteFooter         sections + legal + AI statement
  └── PageHeader         interior-page hero band

Sections (sections/)    Home-page composition units
  ├── Hero
  ├── CapabilitiesPreview
  ├── AudienceGrid
  └── CtaBand

Chat (chat/)            AI assistant seam
  └── AssistantLauncher  persistent entry point (client widget later)
```

## Composition tree

```
RootLayout (app/layout.tsx)
├── Skip link (a11y)
├── SiteHeader
│   ├── Container
│   ├── Brand link
│   ├── Primary <nav>
│   └── Button (glass) → /ai-assistant
├── <main>
│   └── {page}
│       ├── HomePage
│       │   ├── Hero ──────────── Container · AiBadge · Button
│       │   ├── CapabilitiesPreview ─ Section · SectionHeading · GlassPanel[]
│       │   ├── AudienceGrid ────── Section · SectionHeading · grid
│       │   └── CtaBand ─────────── Section · Button
│       └── Interior pages (Meet KARINA, AI Assistant, Training, …)
│           ├── PageHeader ─────── Container · Eyebrow
│           └── Section[] ──────── SectionHeading · GlassPanel · RoadmapNote
├── SiteFooter
│   ├── Brand + description + AiBadge
│   ├── Sections <nav>
│   └── Legal <nav>
└── AssistantLauncher (fixed)
```

## Conventions

- **Server-first.** Pages and sections are Server Components. Only genuinely
  interactive pieces (future: mobile menu, chat widget, theme toggle) become
  Client Components — keeping JS shipped to the browser minimal (fast).
- **Single responsibility.** Primitives never fetch data; sections compose
  primitives; pages compose sections.
- **Design tokens, not magic values.** Components use Tailwind tokens wired to
  the design system (see doc 3). No hard-coded colors in components.
- **Accessibility built in.** Headings are ordered; interactive elements are
  real `<a>`/`<button>`; focus states are visible; motion respects
  `prefers-reduced-motion`.
- **`cn()` helper** for conditional classes (no runtime CSS-in-JS).

## Planned components (Phase 2+)

| Component | Section | Phase |
|-----------|---------|-------|
| `MobileNav` (client island) | Header | 2 |
| `ThemeToggle` (client island) | Header | 2 |
| `ContactForm` (server action) | Contact | 2 |
| `AssistantPanel` (chat client) | AI Assistant | 3 |
| `VoiceControls` / `AvatarStage` | AI Assistant | 4 |
| `CourseCard` / `LessonPlayer` / `ProgressBar` | Training / Learn | 5 |
| `PricingTable` / `CheckoutButton` | Membership | 6 |
| `PostCard` / `Prose` | Media / Blog | 7 |
