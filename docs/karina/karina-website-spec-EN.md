# KARINA — International Website Specification (Characterization Document)

**Version:** 2.0 (reconciled with live site — single source of truth) · **Date:** 2026‑07‑26
**Status:** Specification only — no code, no deploy, no publish
**Product:** KARINA — *The Ultimate Maritime Rescue Dummy* — a life‑size, life‑weight, anatomically‑shaped **Man‑Overboard (MOB) training mannequin**.
**Deliverable:** A standalone, international marketing & lead‑generation website.

> **v2.0 note:** This version replaces the assumptions in v1.0 with facts extracted from the live KARINA landing page. Product facts, branding, and positioning are governed by [`karina-brand-facts-SOURCE-OF-TRUTH.md`](./karina-brand-facts-SOURCE-OF-TRUTH.md). Key corrections: KARINA is a **single product** (not a 4‑model family); IP is a **registered patent** (no SOLAS/IMO certification is claimed); the launch is anchored to the **Monaco Yacht Show, September 2026**.

---

## 0. Table of Contents
1. [Product & Brand Facts](#1-product--brand-facts)
2. [Project Goals & Audiences](#2-project-goals--audiences)
3. [Site Map](#3-site-map)
4. [Pages & Sections](#4-pages--sections)
5. [Navigation Hierarchy](#5-navigation-hierarchy)
6. [Wireframes](#6-wireframes)
7. [User Flows](#7-user-flows)
8. [UI Component Library](#8-ui-component-library)
9. [Animation List](#9-animation-list)
10. [Required Videos & Images](#10-required-videos--images)
11. [SEO Strategy](#11-seo-strategy)
12. [Localization (EN/HE)](#12-localization)
13. [Technical, Accessibility & Performance](#13-technical-accessibility--performance)
14. [Appendix](#14-appendix)

---

## 1. Product & Brand Facts

**What it is:** KARINA is a life‑size (158 cm) female‑form training mannequin that behaves like a real casualty in water — head floats, body submerges, realistic drift and tow — solving the core flaw of standard MOB training buoys.

**Technical specifications (from the live site):**
| Attribute | Value |
|---|---|
| Total height | 158 cm · life‑size female form |
| Dry weight | 70 kg · matches average adult female |
| In‑water weight | 55–65 kg · anatomically accurate buoyancy |
| Shoulder width | 42 cm |
| Buoyancy profile | Head floats · body submerges · realistic drift |
| Construction | Waterproof fabric · internal filling · calibrated weights |
| Retrieval | Integrated towing strap · compatible with standard rescue gear |
| IP status | **Patent registered** · prototype complete · production ready |

**Key features:** True MOB behavior · Calibrated weight · Professional tow strap (waist + thigh) · Open‑water ready (ocean/port/lake/pool) · Visual realism (anatomical form) · Durable & low maintenance.

**Brand:** Navy `#0d1b2e`/`#122536` + Gold `#c9a84c`/`#dfc078` + Cream `#f4ede0`. Fonts: **Cormorant Garamond** (display, serif) + **Montserrat** (body). Tone: luxury, maritime, minimal — *"Designed for realism. Engineered for safety."* Logo today is a gold **text wordmark** (no vector logo file yet).

**Launch anchor:** **Monaco Yacht Show — September 2026** (international debut).

**Founder:** **Karin Keren** — Entrepreneur · Skipper · Inventor (Israel); patent holder.

**Contact:** `karin@karinkeren.com` · WhatsApp/phone `+972‑54‑624‑8546`.

---

## 2. Project Goals & Audiences

### 2.1 Business goals
| # | Goal | Primary KPI |
|---|------|-------------|
| G1 | Generate qualified B2B leads / demo requests | "Request Information" & "Book a Demonstration" submissions |
| G2 | Convert Monaco Yacht Show interest | Demo bookings tagged Monaco 2026 |
| G3 | Establish credibility (patent, realism, founder story) | Time on Technology/About, spec‑sheet downloads |
| G4 | International reach | Organic traffic by country; EN/HE coverage |

### 2.2 Audiences (the 8 segments the product serves)
Naval & Coast Guard · Sailing Schools & Skipper Courses · Superyacht Crew Certification · Maritime Police & Rescue · Lifeguard Training Centers · Offshore & Oil‑Platform Workers · Maritime Academies · Cruise & Ferry Operators.

### 2.3 Primary conversion
**Request Information** (primary) and **Book a Demonstration** (Monaco / on‑site). No e‑commerce.

---

## 3. Site Map

```
KARINA.com  (default: EN  ·  locale switch: EN | HE  ·  extensible: FR/IT/ES/EL)
│
├── / ………………………………………… Home
├── /product …………………………… The KARINA Mannequin (single product)
│   └── /product/specifications … Technical Specifications
├── /technology ……………………… How It Works (buoyancy, weight, tow, materials)
├── /industries ……………………… Who Needs KARINA (hub)
│   ├── /industries/naval-coast-guard
│   ├── /industries/sailing-schools
│   ├── /industries/superyacht-crew
│   ├── /industries/maritime-police-rescue
│   ├── /industries/lifeguard
│   ├── /industries/offshore-energy
│   ├── /industries/maritime-academies
│   └── /industries/cruise-ferry
├── /patent ……………………………… Patent & Innovation (IP status, no cert claims)
├── /monaco ……………………………… Monaco Yacht Show 2026 (debut + book a demo)
├── /about ………………………………… Karin Keren — the inventor / story
├── /resources ………………………… Resources (hub)
│   ├── /resources/videos ………… Video library
│   ├── /resources/downloads …… Spec sheet, brochure
│   └── /resources/faq …………………… FAQ
├── /request-info ……………………… Request Information  (primary conversion)
├── /book-demo …………………………… Book a Demonstration  (secondary conversion)
├── /contact ……………………………… Contact
└── System: /search · /404 · /500 · sitemap.xml · robots.txt
    └── /legal/{privacy,terms,cookies,accessibility}
```

**Depth rule:** no primary content deeper than 3 clicks from Home.

---

## 4. Pages & Sections

Reusable blocks: **[Header]** · **[Footer]** · **[CTA‑Band]** (Request Info / Book Demo) · **[Breadcrumb]** on all non‑home pages.

### 4.1 Home `/`
1. **Hero** — full‑bleed image/video of KARINA in the sea, wordmark, "The Ultimate Maritime Rescue Dummy", sub "A medical & educational training solution for seafaring", event tag "Monaco Yacht Show · Sept 2026", CTA (Request Information / Watch it work). Stat strip: 158 cm · 70 kg · 55–65 kg in water.
2. **The Challenge** — "MOB Training Has a Fatal Flaw" (false muscle memory · wrong weight & drag · no human shape → KARINA solves all three).
3. **What is KARINA** — 3 value props (Realistic · Life‑weight · Anatomical).
4. **Technical Specifications** — spec strip + link to full specs.
5. **Why KARINA** — 6 feature cards (True MOB behavior, calibrated weight, tow strap, open‑water, visual realism, durable).
6. **Who Needs KARINA** — 8 audience tiles → industry pages.
7. **Monaco** — debut banner → `/monaco` (Book a Demonstration).
8. **The Inventor** — Karin Keren teaser → `/about`.
9. **Patent badge** — "Patent Registered" → `/patent`.
10. **[CTA‑Band]** — Request Information · **Contact** (email + WhatsApp).
11. **[Footer]**.

### 4.2 Product `/product`
1. [Breadcrumb] 2. Product hero (gallery/360) + wordmark + one‑liner + CTA (Request Info / Download spec sheet) 3. Key spec strip 4. Highlights (image↔text ×4: buoyancy, weight, tow strap, durability) 5. In‑water demo video 6. Full spec table → `/product/specifications` 7. Best for (8 audience chips) 8. Patent note 9. [CTA‑Band] 10. [Footer].

### 4.3 Specifications `/product/specifications`
1. [Breadcrumb] 2. Full spec table (height, weights, shoulder width, buoyancy profile, construction, retrieval, IP status) 3. Materials & environmental notes (ocean/port/lake/pool) 4. Packaging & shipping (TBD) 5. Download spec sheet (PDF) 6. [CTA‑Band] 7. [Footer].

### 4.4 Technology `/technology`
1. Hero 2. Anatomy/buoyancy interactive (annotated: head floats / body submerges) 3. Calibrated weight system (internal metal weights) 4. Professional tow strap (waist + thigh) 5. Materials & durability 6. Open‑water performance 7. [CTA‑Band] 8. [Footer].

### 4.5 Industries hub `/industries` + detail template
Hub: intro + 8 audience tiles. Detail: [Breadcrumb] · segment hero · why this segment needs realistic MOB training · how KARINA fits · relevant feature highlights · testimonial (when available) · [CTA‑Band].

### 4.6 Patent & Innovation `/patent`
1. [Breadcrumb] 2. The innovation (first true human‑form MOB mannequin) 3. Patent status (registered · prototype complete · production ready) 4. What it does NOT claim — legal‑accurate note (no SOLAS/IMO certification claim unless/until obtained) 5. [CTA‑Band] 6. [Footer].

### 4.7 Monaco `/monaco`
1. Hero (Monaco/superyacht) 2. "KARINA makes her international debut" 3. Event details (Monaco Yacht Show, September 2026) 4. Book a live demonstration (form/scheduling) 5. Gallery (once available) 6. [Footer].

### 4.8 About `/about`
1. Section label "The Mind Behind KARINA" 2. Karin Keren — Entrepreneur · Skipper · Inventor 3. Story/mission (identified the gap; realistic human‑shaped MOB training) 4. Credentials (Patent Holder · Open‑Water Skipper · Monaco 2026) 5. [CTA‑Band] 6. [Footer].

### 4.9 Resources `/resources` (+ /videos, /downloads, /faq)
Hub with videos, downloads (spec sheet, brochure), FAQ (Product, Patent, Shipping, Training, Demo). Each ends in [CTA‑Band].

### 4.10 Request Information `/request-info` (primary)
Intro/reassurance · form (name, org, role, country, use case/segment, message) · trust elements · confirmation with reference # · [Footer].

### 4.11 Book a Demonstration `/book-demo`
Form (org, region, Monaco vs on‑site, preferred date, segment) + scheduling embed placeholder + confirmation.

### 4.12 Contact `/contact`
Email (`karin@karinkeren.com`), WhatsApp (`+972‑54‑624‑8546`), form, response‑time note, [Footer].

### 4.13 Utility
Search, 404 (underwater visual + links), 500, legal (privacy/terms/cookies/accessibility).

---

## 5. Navigation Hierarchy

### 5.1 Header (desktop)
```
[KARINA wordmark]   Product ▾   Technology   Who Needs It ▾   Patent   Monaco   About      🌐 EN|HE   [ Request Information ]
```
- **Product ▾** → The Mannequin · Specifications · Technology
- **Who Needs It ▾** → the 8 audiences
- Persistent CTA: **Request Information**; secondary quick‑contact (WhatsApp) icon.

### 5.2 Header (mobile)
`[☰]  [KARINA]  [Request Info]` → off‑canvas accordion; WhatsApp + locale + search at top; sticky "Request Information" bottom.

### 5.3 Footer (columns)
Product (Mannequin, Specs, Technology) · Who Needs It (8 audiences) · Company (About, Patent, Monaco, Resources, Contact) · Utility (locale, WhatsApp, email, legal, © 2026 KARINA · Patent Registered · Inventor: Karin Keren · Israel).

### 5.4 Secondary nav
Breadcrumbs on all non‑home pages; sticky in‑page anchor nav on Technology & Specifications; contextual "next step" links (product → technology → request info).

---

## 6. Wireframes

`▓` media/video · `■` image · `▤` text · `◼` button. (Shown LTR for structure; RTL mirrored for Hebrew.)

### 6.1 Home
```
┌───────────────────────────────────────────────────────────────┐
│ [KARINA]  Product Technology Who-Needs-It Patent Monaco About  🌐 [Request Info]│
├───────────────────────────────────────────────────────────────┤
│ ▓ HERO — KARINA in the sea (navy/gold)                        │
│   ◆ Monaco Yacht Show · Sept 2026                             │
│   KARINA — The Ultimate Maritime Rescue Dummy                 │
│   ◼ Request Information   ◻ Watch it work                     │
│   stats: [158cm] [70kg] [55–65kg in water]                   │
├───────────────────────────────────────────────────────────────┤
│ THE CHALLENGE — "MOB Training Has a Fatal Flaw"               │
│ [False muscle memory][Wrong weight & drag][No human shape][✦KARINA]│
├───────────────────────────────────────────────────────────────┤
│ Specs strip: height | dry wt | in-water | buoyancy | tow      │
├───────────────────────────────────────────────────────────────┤
│ Why KARINA — 6 feature cards                                  │
├───────────────────────────────────────────────────────────────┤
│ Who Needs KARINA — [8 audience tiles]                         │
├───────────────────────────────────────────────────────────────┤
│ 🇲🇨 Monaco Yacht Show 2026  ◼ Book a Demonstration            │
├───────────────────────────────────────────────────────────────┤
│ The Inventor — ■ Karin Keren  → About                         │
├───────────────────────────────────────────────────────────────┤
│ ⚓ Patent Registered → learn more                             │
├───────────────────────────────────────────────────────────────┤
│ CTA-BAND: Request Information · ✉ karin@karinkeren.com · 💬 WA │
├───────────────────────────────────────────────────────────────┤
│ FOOTER                                                        │
└───────────────────────────────────────────────────────────────┘
```

### 6.2 Product
```
│ breadcrumb: Home / Product                                    │
│ ■ gallery/360        │  KARINA                               │
│ [thumb][thumb]       │  one-liner · ⚓ Patent Registered      │
│                      │  ◼ Request Information ◻ Spec sheet    │
│ spec strip: 158cm | 70kg | 55–65kg | tow strap | waterproof   │
│ Highlights ■|▤ (buoyancy / weight / tow / durability) ×4      │
│ ▓ in-water demo video                                         │
│ full spec table  ▤▤▤ → Specifications                         │
│ Best for: [naval][sailing][superyacht][police][lifeguard]…    │
│ CTA-BAND · FOOTER                                             │
```

### 6.3 Technology
```
│ sticky sub-nav: Buoyancy · Weight · Tow · Materials · Open-water│
│ ▓ hero                                                        │
│ [Buoyancy] ■ annotated cutaway (head floats / body submerges) │
│ [Weight] ■|▤ calibrated internal weights                      │
│ [Tow] ▓ waist+thigh strap detail                              │
│ [Materials] ▤ waterproof fabric / internal filling            │
│ CTA-BAND · FOOTER                                             │
```

### 6.4 Industry detail
```
│ breadcrumb                                                    │
│ ▓ segment hero (e.g. coast guard)  H1 + sub                  │
│ Why realistic MOB training matters here ▤                     │
│ How KARINA fits ■|▤ ×3                                        │
│ Feature highlights · testimonial (if any)                     │
│ CTA-BAND · FOOTER                                             │
```

### 6.5 Monaco
```
│ ▓ Monaco / superyacht hero                                   │
│ H1: KARINA — International Debut · Monaco Yacht Show Sept 2026 │
│ event details ▤ · ◼ Book a Demonstration                     │
│ gallery (when available) · FOOTER                            │
```

### 6.6 Patent
```
│ breadcrumb                                                    │
│ The innovation ▤ · Patent status: Registered / Prototype / Prod-ready│
│ Legal-accurate note: no SOLAS/IMO certification claimed       │
│ CTA-BAND · FOOTER                                            │
```

### 6.7 About (Inventor)
```
│ "The Mind Behind KARINA"                                     │
│ ■ Karin Keren  │  Entrepreneur · Skipper · Inventor          │
│                │  story/mission ▤                            │
│ tags: [Patent Holder][Open-Water Skipper][Monaco 2026]        │
│ CTA-BAND · FOOTER                                            │
```

### 6.8 Request Information
```
│ Request Information                                           │
│ ┌ name / org / role / country / segment ▾ / message ┐        │
│ │ ◼ Send                                            │        │
│ side: ✉ karin@karinkeren.com · 💬 WhatsApp · "reply within 1 business day"│
│ → confirmation (reference #) · FOOTER                        │
```

### 6.9 404
```
│ ▓ underwater visual · "This one drifted off course." · [search] · links │
```

---

## 7. User Flows

### 7.1 Primary — segment buyer → Request Information
```
Search ("man overboard training dummy" / "MOB rescue mannequin")
 → Home → The Challenge → Why KARINA → Technology/Specs
 → download spec sheet → Request Information (segment + message)
 → confirmation (reference #) → [email/WhatsApp follow-up]
```

### 7.2 Monaco → Book a Demonstration
```
Home/Monaco banner → /monaco → event details → Book a Demonstration
 → form (Monaco vs on-site, date, segment) → confirmation
```

### 7.3 Quick contact (mobile)
```
Any page → sticky WhatsApp / Request Info → short form or wa.me/972546248546
```

### 7.4 Credibility path
```
Home → Patent → Technology → About (Karin Keren) → Request Information
```

### 7.5 Locale switch
```
Any page → 🌐 EN|HE → equivalent page, RTL/LTR applied
```

**Global rules:** every content page ends in a CTA‑band; every form ends in a confirmation; every dead end offers a next action.

---

## 8. UI Component Library

**Global/layout:** announcement bar (Monaco countdown, dismissible) · sticky header + dropdowns / off‑canvas mobile · locale switch (EN/HE) · site search · breadcrumbs · sticky in‑page anchor nav · footer + WhatsApp/email row · CTA band · cookie consent · back‑to‑top.

**Content blocks:** hero (image/video) · challenge cards · value‑prop cards · feature cards · stat strip · spec table · audience tile · industry detail layout · interactive buoyancy/anatomy diagram · testimonial/quote · inventor bio block · patent badge · Monaco event block · timeline (story).

**Media:** responsive image (`srcset`) · video hero (muted loop, poster, reduced‑motion fallback) · lightbox player · gallery/360 viewer · logo/wordmark.

**Forms:** text/email/phone/textarea/select/country‑select · segment select · multi‑step (request info / book demo) · validation states · confirmation panel · scheduling embed placeholder · WhatsApp deep‑link button.

**Interactive/utility:** buttons (primary gold / secondary / ghost / icon / WhatsApp) · chips/filters · pagination/load‑more · toast · modal/drawer · tooltip · skeleton loaders · empty/error states · scroll progress.

**States per component:** default · hover · focus (visible ring) · active · disabled · loading · error · empty · RTL mirror.

---

## 9. Animation List

> All respect `prefers-reduced-motion`. 150–600 ms, ease‑out entrances. Marine/gold‑restrained motion.

| # | Where | Animation | Trigger |
|---|-------|-----------|---------|
| A1 | Hero | Slow zoom / gentle parallax on sea image/video | load/scroll |
| A2 | Hero text | Staggered fade‑up (wordmark → sub → CTA → stats) | load |
| A3 | Header | Shrink/elevate on scroll; hide‑down/show‑up | scroll |
| A4 | Announcement | Monaco countdown subtle pulse | ambient |
| A5 | Challenge cards | Fade‑up on enter; highlight the "KARINA solves" card | scroll |
| A6 | Stat strip | Count‑up (158 / 70 / 55–65) | enter viewport |
| A7 | Feature cards | Lift + shadow on hover | hover |
| A8 | Audience tiles | Scroll‑snap row / hover highlight | scroll/hover |
| A9 | Buoyancy diagram | Hotspot pulse; water‑line reveal (head floats/body submerges) | hover/tap |
| A10 | Gold divider | Shimmer sweep | ambient (subtle) |
| A11 | Dropdown menus | Fade + slide‑down | hover/focus |
| A12 | Accordion (FAQ) | Height expand + chevron rotate | click |
| A13 | Multi‑step form | Step slide + progress fill | next/back |
| A14 | Buttons | Press + focus ring; loading spinner | interaction |
| A15 | CTA band | Subtle current/wave motion | ambient |
| A16 | Lightbox | Scale‑in + backdrop fade | open/close |
| A17 | Monaco block | Flag/parallax subtle | scroll |
| A18 | Toasts | Slide‑in + auto‑dismiss | event |
| A19 | Scroll progress | Thin top bar on long pages | scroll |
| A20 | Confirmation | Check‑mark draw | submit |
| A21 | Back‑to‑top | Fade in past 1 viewport | scroll |
| A22 | Skeletons | Shimmer while loading | load |

---

## 10. Required Videos & Images

Governed by the Media Library: [`media-library/`](./media-library/) — 9 categories (Hero, Gallery, Technology, Training, Rescue, Monaco, Founder, Concept Vision, Marketing) + logos + icons. Full per‑asset list with filenames, formats and recommended dimensions in [`media-library/media-registry.csv`](./media-library/media-registry.csv) and [`media-library/missing-assets.md`](./media-library/missing-assets.md).

**Already live (HAVE):** Hero image ("KARINA floating in the sea") and Technical Diagram (both on the Base44 CDN). **`public/images/karin.jpg`** available for the founder/About.

**Highest‑priority to produce:** in‑water demo video (Rescue) · buoyancy/anatomy cutaway (Technology) · studio + 360 product shots (Gallery) · Karin Keren portrait/action (Founder) · Monaco event imagery (Monaco) · vector logo + favicon (Logos) · real icon set (Icons) · OG/social images (Marketing) · spec‑sheet & brochure.

**Video delivery:** MP4+WebM, poster, captions EN/HE, reduced‑motion static fallback. **Images:** AVIF/WebP + JPG fallback, alt text per image.

---

## 11. SEO Strategy

### 11.1 Keyword themes
- **Transactional:** "man overboard training dummy", "MOB rescue mannequin", "maritime rescue training dummy", "man overboard drill equipment", "rescue mannequin for sale".
- **Segment:** "coast guard MOB training", "sailing school man overboard drill", "superyacht crew rescue training", "lifeguard rescue mannequin".
- **Informational (resources/FAQ):** "how to run a man overboard drill", "man overboard recovery techniques", "MOB drill checklist", "why buoys fail MOB training".
- **Brand/event:** "KARINA rescue mannequin", "KARINA Monaco Yacht Show 2026", "Karin Keren KARINA".

Each primary page owns one cluster; resources capture informational long‑tail feeding Request Information.

### 11.2 On‑page
Unique title (≤60) + meta description (≤155) per page, localized · single H1 · logical H2/H3 mirroring sections · clean human URLs (per site map) · hub‑and‑spoke internal links · image alt text + descriptive filenames · breadcrumb markup.

### 11.3 Technical
- i18n: locale‑prefixed URLs (`/en/`, `/he/`), `hreflang` incl. `x-default`, per‑locale sitemaps.
- XML sitemap + robots.txt · self‑referencing canonicals · Core Web Vitals (LCP<2.5s, INP<200ms, CLS<0.1) · mobile‑first · HTTPS/HTTP2 · next‑gen images · lazy‑load.
- Structured data (JSON‑LD): `Organization` (KARINA / Karin Keren), `Product` (the mannequin, spec properties), `BreadcrumbList`, `FAQPage`, `VideoObject`, `Event` (Monaco Yacht Show 2026), `Person` (Karin Keren).

### 11.4 Content & authority
Resources/FAQ targeting MOB‑drill informational queries → CTA. Monaco Yacht Show 2026 as a PR/event‑SEO hook (Event schema, press). Founder story for E‑E‑A‑T. Backlinks from maritime‑safety, sailing‑school, and event/press outlets.

### 11.5 Measurement
Search Console per locale · analytics goals mapped to G1–G4 · event tracking (Request Info submit, Book Demo, spec‑sheet download, WhatsApp click, video play) · rank tracking for seed clusters.

### 11.6 Launch checklist
Sitemap submitted · robots verified · structured data validated (incl. Event) · titles/metas/hreflang audited · CWV pass · 404/500 handled · analytics + Search Console per locale.

---

## 12. Localization

- **Launch:** English (default, `x-default`) + Hebrew (RTL). Extensible to FR/IT/ES/EL (Monaco/Med markets).
- **RTL:** full mirroring for Hebrew — layout, nav, breadcrumbs, sliders, directional icons, form alignment; robust Hebrew font paired with the brand stack (Cormorant Garamond/Montserrat both support Hebrew fallbacks — specify a Hebrew display + body pairing).
- **Content model:** every page/string/alt/meta/document has EN + HE; fallback to EN.
- **Locale switch:** persists; switches to the equivalent page; locale‑prefixed URL.
- **Translation:** transcreation for headlines/CTAs; consistent marine/safety glossary; numbers/units (cm, kg) and phone formats localized.

---

## 13. Technical, Accessibility & Performance
*(Spec constraints for the future build.)*
- **Accessibility:** WCAG 2.2 AA — semantic landmarks, keyboard, visible focus, contrast (verify gold `#c9a84c` on navy meets AA for text sizes used), alt text, captioned video, labelled forms, skip‑link, reduced‑motion, accessibility statement.
- **Performance:** CWV green; image/video optimization; code‑split; lazy‑load; CDN; per‑page weight budget.
- **Responsive:** mobile‑first; ≥44px touch targets.
- **Privacy:** cookie consent, GDPR‑ready forms, privacy policy, form spam protection.
- **CMS:** localizable content types (page, product, industry, resource, FAQ, video, download) — selection is phase 2.
- **Security:** HTTPS, form validation/sanitization, rate‑limiting.

---

## 14. Appendix

### 14.1 To produce before build
Copy per page (EN/HE) · media assets (see Media Library) · spec sheet & brochure · founder photography · Monaco assets · vector logo + favicon + icon set · translations · legal‑reviewed patent/claims wording.

### 14.2 Open questions
1. Confirm additional launch locales beyond EN/HE (FR/IT for Monaco?).
2. Any certification pathway to claim later (currently patent only)?
3. Distributor/reseller plan (not present on current site) — include now or phase 2?
4. Demo scheduling / CRM tool for lead routing.
5. Where are the FLOW / ChatGPT concept renders (if any) — to add to Media Library.

### 14.3 Phasing
- **Phase 1 (MVP):** Home, Product (+specs), Technology, Industries (hub + 8), Patent, Monaco, About, Resources (videos/downloads/FAQ), Request Info / Book Demo / Contact, legal, EN+HE.
- **Phase 2:** case studies/testimonials engine, distributor network, added locales, richer video library.

---

*End of English specification v2.0. Hebrew mirror: `karina-website-spec-HE.md`. Product facts: `karina-brand-facts-SOURCE-OF-TRUTH.md`.*
