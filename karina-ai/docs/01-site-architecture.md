# 1. Site Architecture

The platform is organized around **eight core sections**. Each is a route in the
Next.js App Router and a first-class destination in the primary navigation.

## Sitemap

```
/                     Home
├── /meet-karina      Meet KARINA        — who KARINA is (AI character)
├── /ai-assistant     AI Assistant       — chat / voice / avatar experience
├── /training         Training           — scenario-based learning
├── /technology       Technology         — how the platform works
├── /partners         Partners           — collaboration & pilots
├── /media            Media              — blog + press library
├── /contact          Contact            — inbound / partnerships
├── /privacy          Privacy (utility)  — added Phase 2
└── /terms            Terms (utility)    — added Phase 2
```

### Reserved application routes (Phase 2+)

These are **planned**, not built in Phase 1. They are documented so the
information architecture is stable from the start.

```
/account/*           User dashboard, profile, settings          (Phase 5)
/account/membership  Plan & billing                             (Phase 6)
/learn/*             Enrolled courses, lessons, progress        (Phase 5)
/org/*               Organization admin (schools, academies…)   (Phase 5)
/api/*               Server routes: chat, contact, webhooks     (Phase 2+)
```

## Section intent

| Section | Purpose | Primary audience |
|---------|---------|------------------|
| **Home** | Establish KARINA and the platform; route to depth | All |
| **Meet KARINA** | Identity, principles, transparency as an AI character | All |
| **AI Assistant** | Explain and (later) host the chat/voice/avatar experience | All |
| **Training** | Present the learning model; later, the course platform | Skippers, schools, academies |
| **Technology** | Communicate trust, architecture, and privacy | Technical / partners |
| **Partners** | Invite collaboration; later, show approved partners only | Schools, charters, equipment, rescue |
| **Media** | Blog + press/media resources | Press, community |
| **Contact** | Inbound enquiries and partnership conversations | All |

## Navigation model

- **Global header** — persistent, links to all eight sections; collapses to a
  mobile menu (interactive island added in Phase 2). Includes a quick entry to
  the AI assistant.
- **Assistant launcher** — a persistent, accessible floating entry point to
  KARINA (the seam for the live conversational widget).
- **Global footer** — full section list, legal/utility links, and a permanent
  "KARINA is an AI character" statement.

## Content principles (Phase 1)

1. **No fabricated content.** No fake testimonials, certifications, partner
   logos, or statistics anywhere.
2. **Transparent roadmap.** Where a feature needs future services, the UI shows
   an honest *Roadmap* note instead of placeholder filler.
3. **AI clarity everywhere.** KARINA is labelled as an AI character wherever she
   is represented.

## Cross-cutting concerns

- **SEO / metadata** — per-route `metadata`, Open Graph, `metadataBase`.
- **Accessibility** — skip link, semantic landmarks, focus-visible rings,
  reduced-motion support, theme-aware contrast.
- **Internationalization** — single locale in Phase 1; routing is structured so
  a locale segment can be introduced without reworking the tree ("global"
  audience is a first-class goal).
