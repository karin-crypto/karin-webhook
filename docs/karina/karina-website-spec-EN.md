# KARINA — International Website Specification (Characterization Document)

**Version:** 1.0 · **Date:** 2026‑07‑25 · **Status:** Specification only — no code, no deploy, no publish
**Product:** KARINA — Professional Maritime Training Manikin (Man‑Overboard / Water‑Rescue Training Doll)
**Deliverable:** A fully standalone, international marketing & lead‑generation website.

---

## 0. Table of Contents

1. [Project Overview & Goals](#1-project-overview--goals)
2. [Site Map](#2-site-map)
3. [Pages & Sections](#3-pages--sections)
4. [Navigation Hierarchy](#4-navigation-hierarchy)
5. [Wireframes (per page)](#5-wireframes)
6. [User Flows](#6-user-flows)
7. [UI Component Library](#7-ui-component-library)
8. [Animation List](#8-animation-list)
9. [Required Videos & Images](#9-required-videos--images)
10. [SEO Strategy](#10-seo-strategy)
11. [Localization (EN/HE) & RTL](#11-localization)
12. [Technical, Accessibility & Performance Requirements](#12-technical-accessibility--performance)
13. [Appendix — Content Inventory & Open Questions](#13-appendix)

---

## 1. Project Overview & Goals

### 1.1 Product in one line
KARINA is a life‑size, marine‑grade **training manikin** used to run realistic **man‑overboard (MOB)**, water‑rescue and recovery drills — for ship crews, navies, coast guards, offshore installations, cruise lines, ports, maritime academies, SAR teams and lifeguards.

### 1.2 Business goals
| # | Goal | Primary KPI |
|---|------|-------------|
| G1 | Generate qualified B2B leads | Quote requests / demo requests submitted |
| G2 | Establish authority & trust (safety, compliance) | Time on Resources, datasheet downloads |
| G3 | Support the distributor/reseller network | "Find a distributor" interactions, partner applications |
| G4 | Educate the market (drills, standards) | Video plays, training‑guide reads |
| G5 | International reach | Organic traffic by country, locale coverage |

### 1.3 Primary audiences (personas)
- **P1 — Safety / HSE Officer** (shipping, offshore): needs compliance proof, drill realism, datasheets.
- **P2 — Fleet / Procurement Manager**: needs models comparison, pricing path, bulk/quote.
- **P3 — Training Coordinator** (academy, SAR, lifeguard): needs training protocols, videos, durability.
- **P4 — Distributor / Reseller**: needs partner program, margins, marketing assets.
- **P5 — Navy / Coast Guard buyer**: needs specs, ruggedness, procurement/tender support.

### 1.4 Success definition
A visitor can, within ~2 minutes: understand what KARINA is, see it work (video), find the right model, confirm it meets their standard, and take one clear action — **Request a Quote** or **Find a Distributor**.

---

## 2. Site Map

```
KARINA.com  (default: EN  ·  locale switch: EN | HE  ·  extensible: ES/FR/DE/EL/ZH)
│
├── / …………………………………………………… Home
│
├── /product ……………………………………… Product (overview / hub)
│   ├── /product/karina-pro ………… KARINA Pro   (adult, full-weight MOB)
│   ├── /product/karina-lite ……… KARINA Lite  (lightweight / drill volume)
│   ├── /product/karina-cadet …… KARINA Cadet (child-size / lifeguard)
│   ├── /product/karina-sar ……… KARINA SAR   (weighted / helicopter & rough-sea)
│   ├── /product/compare ………………… Model Comparison
│   └── /product/accessories …… Accessories & Spare Parts
│
├── /technology ……………………………… Features & Technology
│
├── /industries ……………………………… Industries / Use Cases (hub)
│   ├── /industries/commercial-shipping
│   ├── /industries/navy-coast-guard
│   ├── /industries/offshore-energy
│   ├── /industries/cruise-passenger
│   ├── /industries/ports-harbors
│   ├── /industries/maritime-academies
│   ├── /industries/search-and-rescue
│   └── /industries/lifeguard-water-safety
│
├── /specifications ………………………… Technical Specifications
│
├── /compliance …………………………………… Compliance & Certifications (SOLAS/IMO context)
│
├── /resources ……………………………………… Resources (hub)
│   ├── /resources/training ……………… Training & Drill Protocols
│   ├── /resources/videos ………………… Video Library
│   ├── /resources/downloads …………… Datasheets, Manuals, CAD
│   ├── /resources/case-studies …… Case Studies
│   ├── /resources/blog ……………………… News & Blog
│   │   └── /resources/blog/{slug} … Article
│   └── /resources/faq …………………………… FAQ
│
├── /distributors ……………………………… Find a Distributor / Where to Buy (map)
│   └── /distributors/become-a-partner … Partner / Reseller Program
│
├── /about ……………………………………………… About the Company
│   ├── /about/story …………………………… Story / Mission
│   ├── /about/careers ……………………… Careers (optional / phase 2)
│   └── /about/press ………………………… Press & Media Kit
│
├── /quote ……………………………………………… Request a Quote  (primary conversion)
├── /demo ………………………………………………… Book a Demo / Trial  (secondary conversion)
├── /contact ………………………………………… Contact
│
└── System / Utility
    ├── /search ……………………………………… Search results
    ├── /404 …………………………………………… Not found
    ├── /500 …………………………………………… Error
    ├── /sitemap.xml, /robots.txt … Machine
    ├── /legal/privacy ………………………… Privacy Policy
    ├── /legal/terms ………………………………… Terms of Use
    ├── /legal/cookies ……………………………… Cookie Policy
    └── /legal/accessibility ………………… Accessibility Statement
```

**Depth rule:** No primary content is deeper than **3 clicks** from Home.

---

## 3. Pages & Sections

Legend for reusable blocks: **[Header]** global header · **[Footer]** global footer · **[CTA‑Band]** conversion band (Quote/Demo) · **[Breadcrumb]** on all non‑home pages.

### 3.1 Home `/`
1. **Hero** — cinematic MOB‑drill background video, headline, sub‑headline, dual CTA (Request a Quote / Watch it work).
2. **Trust bar** — logos/segments served + key standard badges (SOLAS/IMO context).
3. **What is KARINA** — 3‑column value props (Realistic · Durable · Compliant).
4. **Product family** — 4 model cards (Pro / Lite / Cadet / SAR) → product pages.
5. **See it in action** — featured drill video + short stat counters (weight, buoyancy, drills survived, years UV‑rated).
6. **Industries strip** — horizontally scrollable industry tiles → industry pages.
7. **Why KARINA** — differentiators (realistic human dynamics, recovery harness, high‑visibility, saltwater/UV resistance).
8. **Compliance & standards** — badges + link to `/compliance`.
9. **Featured case study** — quote + result metric.
10. **Resources teaser** — latest training guide / video / article (3 cards).
11. **Distributor CTA** — "Global network" + map thumbnail → `/distributors`.
12. **[CTA‑Band]** — Request a Quote.
13. **Newsletter signup**.
14. **[Footer]**.

### 3.2 Product hub `/product`
1. [Breadcrumb] 2. Intro/positioning 3. Model selector cards (4) 4. Comparison table teaser → `/product/compare` 5. Accessories teaser 6. "How to choose" guided helper 7. [CTA‑Band] 8. [Footer].

### 3.3 Product detail (template) `/product/{model}`
Applies to Pro / Lite / Cadet / SAR.
1. [Breadcrumb]
2. **Product hero** — 360°/gallery, model name, one‑liner, badges, dual CTA (Quote / Datasheet).
3. **Key specs strip** — weight, height, buoyancy, material, visibility, recovery points.
4. **Highlights** — 3–5 feature blocks (image/text alternating).
5. **In‑water demo video**.
6. **Full spec table** (mirrors `/specifications`, filtered to model).
7. **Best for** — industries/use cases chips → industry pages.
8. **Accessories compatible**.
9. **Compliance for this model**.
10. **Related models** / compare CTA.
11. **[CTA‑Band]** 12. [Footer].

### 3.4 Model comparison `/product/compare`
1. [Breadcrumb] 2. Sticky comparison table (models × attributes, highlight differences) 3. "Recommended for you" helper 4. [CTA‑Band] 5. [Footer].

### 3.5 Accessories `/product/accessories`
1. [Breadcrumb] 2. Category grid (harnesses, throw lines, storage bags, repair kits, ballast, hi‑vis panels, transponders) 3. Item cards (image, name, compatibility, "Add to quote") 4. [CTA‑Band] 5. [Footer].

### 3.6 Technology `/technology`
1. Hero 2. Anatomy interactive (annotated cutaway of the manikin) 3. Materials & durability 4. Human‑realistic dynamics (weight distribution, buoyancy) 5. Recovery & lifting system 6. Visibility & detection (hi‑vis, reflective, optional transponder) 7. Manufacturing & QA 8. [CTA‑Band] 9. [Footer].

### 3.7 Industries hub `/industries`
1. Intro 2. Industry tiles (8) 3. "Not sure?" contact prompt 4. [CTA‑Band] 5. [Footer].

### 3.8 Industry detail (template) `/industries/{segment}`
1. [Breadcrumb] 2. Segment hero (context imagery) 3. Challenge/regulatory context for the segment 4. How KARINA solves it 5. Recommended model(s) 6. Segment case study / testimonial 7. Relevant compliance 8. [CTA‑Band] 9. [Footer].

### 3.9 Specifications `/specifications`
1. [Breadcrumb] 2. Filterable master spec table (all models) 3. Materials & environmental ratings 4. Dimensions & weights 5. Packaging & shipping data 6. Download datasheet (PDF) 7. [CTA‑Band] 8. [Footer].

### 3.10 Compliance `/compliance`
1. [Breadcrumb] 2. Standards context (SOLAS, IMO MSC, MOB drill requirements) 3. Certification/badge grid 4. How KARINA supports drill compliance 5. Downloadable compliance docs 6. Disclaimer (legal) 7. [CTA‑Band] 8. [Footer].

### 3.11 Resources hub `/resources`
1. Intro + search/filter 2. Featured resource 3. Tabs/cards: Training · Videos · Downloads · Case Studies · Blog · FAQ 4. Newsletter 5. [Footer].

### 3.12 Training `/resources/training`
1. [Breadcrumb] 2. Intro 3. Drill protocol library (step‑by‑step accordions) 4. Downloadable drill checklists 5. Related videos 6. [CTA‑Band] 7. [Footer].

### 3.13 Video library `/resources/videos`
1. [Breadcrumb] 2. Filter bar (industry, model, drill type) 3. Video grid (lightbox player) 4. Load more 5. [Footer].

### 3.14 Downloads `/resources/downloads`
1. [Breadcrumb] 2. Filter (type: datasheet/manual/CAD/brochure; model) 3. Download list (gated vs open flagged) 4. [Footer].

### 3.15 Case studies `/resources/case-studies` & detail
List: filterable cards. Detail: challenge → solution → result metrics → quote → related model/CTA.

### 3.16 Blog `/resources/blog` & article `/resources/blog/{slug}`
List: featured + grid + categories/tags + pagination. Article: title, meta, hero, body (rich), share, author, related posts, [CTA‑Band].

### 3.17 FAQ `/resources/faq`
1. [Breadcrumb] 2. Search 3. Category accordions (Product, Compliance, Shipping, Training, Warranty) 4. "Still need help?" → contact 5. [Footer].

### 3.18 Distributors `/distributors`
1. [Breadcrumb] 2. Interactive world map + region filter 3. Distributor list (name, region, contact) 4. "No distributor in your region?" → contact 5. Become‑a‑partner CTA 6. [Footer].

### 3.19 Become a partner `/distributors/become-a-partner`
1. [Breadcrumb] 2. Value proposition for partners 3. Program tiers/benefits 4. Application form 5. FAQ 6. [Footer].

### 3.20 About `/about` (+ /story, /press, /careers)
Company mission, story timeline, values, team (optional), press kit downloads, media contacts, careers listing (phase 2).

### 3.21 Request a Quote `/quote` (primary conversion)
1. Intro/reassurance (response time, privacy) 2. Multi‑step form: (a) products & quantities (b) use case/industry (c) region (d) contact & company 3. Trust elements (logos, "no spam") 4. Confirmation state 5. [Footer].

### 3.22 Demo `/demo`
Book a live/virtual demo or on‑site trial: form (org, region, preferred date, model interest) + calendar/scheduling embed placeholder + confirmation.

### 3.23 Contact `/contact`
1. Contact options (form, email, phone, regional offices) 2. Map/offices 3. Response‑time note 4. [Footer].

### 3.24 Utility pages
Search results, 404 (with helpful links + search), 500, legal pages (privacy/terms/cookies/accessibility), sitemap.

---

## 4. Navigation Hierarchy

### 4.1 Global header (desktop)
```
[KARINA logo]   Product ▾   Technology   Industries ▾   Resources ▾   Compliance   About ▾      🔍   🌐 EN|HE   [ Request a Quote ]
```
**Mega‑menu contents**
- **Product ▾** → Pro · Lite · Cadet · SAR | Compare Models · Accessories | *(promo cell: featured model image + "Which KARINA is right for you?")*
- **Industries ▾** → the 8 segments in a 2‑column list | *(promo cell: featured case study)*
- **Resources ▾** → Training · Videos · Downloads · Case Studies · Blog · FAQ
- **About ▾** → Story · Press · Distributors · Contact

**Persistent CTA:** `Request a Quote` (visually primary), plus search 🔍 and locale switch 🌐.

### 4.2 Global header (mobile)
```
[☰]  [KARINA logo]  [ Quote ]
```
Off‑canvas drawer: accordion nav mirroring desktop; language switch + search at top; sticky "Request a Quote" at bottom.

### 4.3 Footer (4–5 columns)
- **Product:** Pro, Lite, Cadet, SAR, Compare, Accessories
- **Solutions:** all 8 industries
- **Resources:** Training, Videos, Downloads, Case Studies, Blog, FAQ, Compliance, Specifications
- **Company:** About, Press, Careers, Distributors, Become a Partner, Contact
- **Utility bar:** locale switch · newsletter · social icons · legal (Privacy/Terms/Cookies/Accessibility) · © line.

### 4.4 Secondary navigation
- **Breadcrumbs** on every non‑home page.
- **In‑page anchor nav** (sticky sub‑nav) on long pages: Technology, Specifications, Product detail, Compliance.
- **Contextual "next step"** links at section ends (e.g. product → compliance → quote).

---

## 5. Wireframes

Low‑fidelity, structure only. `▓` = media/video, `■` = image, `▤` = text block, `◼` = button.

### 5.1 Home
```
┌───────────────────────────────────────────────────────────────┐
│ [logo]  Product Technology Industries Resources About   🌐 [Quote]│  ← sticky header
├───────────────────────────────────────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓  HERO video (MOB drill)  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│   H1: Train for the moment that matters                        │
│   sub: The professional maritime rescue manikin                │
│   ◼ Request a Quote     ◻ Watch it work                        │
├───────────────────────────────────────────────────────────────┤
│ trust bar:  [seg] [seg] [seg] [seg]   · standards badges       │
├───────────────────────────────────────────────────────────────┤
│  What is KARINA                                                │
│  ┌───────┐   ┌───────┐   ┌───────┐                             │
│  │Realis.│   │Durable│   │Compli.│   (3 value cards, icons)     │
│  └───────┘   └───────┘   └───────┘                             │
├───────────────────────────────────────────────────────────────┤
│  Product family                                                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                               │
│  │ ■Pro│ │■Lite│ │■Cadet│ │■SAR │  each: img/name/one-liner/→   │
│  └─────┘ └─────┘ └─────┘ └─────┘                               │
├───────────────────────────────────────────────────────────────┤
│  See it in action    ▓▓▓▓ featured video ▓▓▓▓                  │
│  counters:  [80kg] [1:1 buoyancy] [500+ drills] [10yr UV]      │
├───────────────────────────────────────────────────────────────┤
│  Industries →  [tile][tile][tile][tile][tile] ▸ (scroll)       │
├───────────────────────────────────────────────────────────────┤
│  Why KARINA   ▤ text  |  ■ image (alternating rows ×3)         │
├───────────────────────────────────────────────────────────────┤
│  Compliance badges …………………………  → Learn more                  │
├───────────────────────────────────────────────────────────────┤
│  “Case study quote”  — result metric        ◼ Read case        │
├───────────────────────────────────────────────────────────────┤
│  Resources: [card][card][card]                                 │
├───────────────────────────────────────────────────────────────┤
│  ▓ world map thumb   Global distributor network  ◼ Find one    │
├───────────────────────────────────────────────────────────────┤
│  CTA-BAND:  Ready to run your next drill?   ◼ Request a Quote  │
├───────────────────────────────────────────────────────────────┤
│  Newsletter  [email____] ◼                                     │
├───────────────────────────────────────────────────────────────┤
│  FOOTER  (Product | Solutions | Resources | Company | utility) │
└───────────────────────────────────────────────────────────────┘
```

### 5.2 Product detail (Pro/Lite/Cadet/SAR)
```
┌───────────── header ──────────────────────────────────────────┐
│ breadcrumb: Home / Product / KARINA Pro                        │
├───────────────────────────────┬───────────────────────────────┤
│  ■ 360° / gallery              │  KARINA Pro                   │
│  [thumb][thumb][thumb]         │  one-liner                    │
│                                │  badges: SOLAS-context, UV10y │
│                                │  ◼ Request a Quote            │
│                                │  ◻ Download datasheet         │
├───────────────────────────────┴───────────────────────────────┤
│ key specs strip: weight | height | buoyancy | material | vis   │
├───────────────────────────────────────────────────────────────┤
│ Highlights   ■ image | ▤ text   (alternating ×4)               │
├───────────────────────────────────────────────────────────────┤
│ ▓ In-water demo video                                          │
├───────────────────────────────────────────────────────────────┤
│ Full spec table  ▤▤▤▤▤▤                                        │
├───────────────────────────────────────────────────────────────┤
│ Best for:  [shipping][offshore][SAR] chips                     │
├───────────────────────────────────────────────────────────────┤
│ Compatible accessories  [card][card][card]                     │
├───────────────────────────────────────────────────────────────┤
│ Compliance for this model  badges + link                       │
├───────────────────────────────────────────────────────────────┤
│ Related models  [Lite][SAR]   ◼ Compare all                   │
├───────────── CTA-BAND ──────────  FOOTER ─────────────────────┤
```

### 5.3 Model comparison
```
│ breadcrumb                                                     │
│ ┌────────────┬────────┬────────┬────────┬────────┐            │
│ │ Attribute  │  Pro   │  Lite  │ Cadet  │  SAR   │  ← sticky  │
│ ├────────────┼────────┼────────┼────────┼────────┤            │
│ │ Weight     │  80kg  │  40kg  │  25kg  │  95kg  │            │
│ │ Buoyancy   │  ✓✓✓   │  ✓✓    │  ✓✓    │  ✓✓✓   │            │
│ │ … rows …   │        │        │        │        │            │
│ │ [Quote]    │  ◼     │  ◼     │  ◼     │  ◼     │            │
│ └────────────┴────────┴────────┴────────┴────────┘            │
│ “Recommended for you” helper (answer 2 Qs → model)            │
```

### 5.4 Industry detail
```
│ breadcrumb                                                     │
│ ▓ segment hero (e.g. offshore rig at dusk)  H1 + sub          │
│ Challenge / regulatory context  ▤▤▤                            │
│ How KARINA solves it   ■ | ▤  (×3)                             │
│ Recommended model(s)  [card][card]                             │
│ “Quote from customer”  — metric                                │
│ Relevant compliance badges                                     │
│ CTA-BAND · FOOTER                                              │
```

### 5.5 Technology
```
│ sticky sub-nav: Anatomy · Materials · Dynamics · Recovery · QA │
│ ▓ hero                                                         │
│ [Anatomy] interactive cutaway ■ with + hotspots               │
│ [Materials] ▤ | ■                                              │
│ [Dynamics] ■ | ▤                                               │
│ [Recovery] ▓ short loop                                        │
│ [Visibility] ■ hi-vis / reflective                            │
│ [QA] ▤                                                         │
│ CTA-BAND · FOOTER                                              │
```

### 5.6 Specifications
```
│ breadcrumb + sticky sub-nav                                    │
│ filter chips: [All][Pro][Lite][Cadet][SAR]                     │
│ master spec table (responsive → stacked cards on mobile)       │
│ Materials & env ratings ▤                                      │
│ Dimensions/weights ▤   Packaging/shipping ▤                    │
│ ◼ Download full datasheet (PDF)                                │
│ CTA-BAND · FOOTER                                              │
```

### 5.7 Compliance
```
│ breadcrumb                                                     │
│ standards context ▤▤                                           │
│ badge grid  [■][■][■][■]                                       │
│ how KARINA supports drill compliance ▤ | ■                     │
│ downloadable docs list                                         │
│ legal disclaimer (small)                                       │
│ CTA-BAND · FOOTER                                              │
```

### 5.8 Resources hub
```
│ intro + [search____] filter                                    │
│ ▓ featured resource (wide card)                                │
│ tabs: Training | Videos | Downloads | Cases | Blog | FAQ       │
│ card grid (12) → load more                                     │
│ newsletter                                                     │
│ FOOTER                                                         │
```

### 5.9 Video library
```
│ filter bar: [industry ▾][model ▾][drill type ▾]                │
│ ┌▓──┐ ┌▓──┐ ┌▓──┐                                             │
│ │play│ │play│ │play│   grid, click → lightbox player           │
│ └───┘ └───┘ └───┘                                             │
│ ◼ Load more · FOOTER                                          │
```

### 5.10 Distributors
```
│ breadcrumb                                                     │
│ ┌───────────────────────────┐  region filter ▾                │
│ │  ◯ interactive world map  │  ┌ distributor list ┐          │
│ │   ● ● pins per region     │  │ name / region /→ │          │
│ └───────────────────────────┘  └──────────────────┘          │
│ “No distributor near you?” ◼ Contact us                       │
│ Become a partner CTA · FOOTER                                  │
```

### 5.11 Request a Quote (multi‑step)
```
│  Step ● ─ ○ ─ ○ ─ ○   (Products · Use case · Region · Contact)│
│  ┌──────────────────────────────────────────┐                 │
│  │ [Pro ▢] qty[__]  [Lite ▢] qty[__] …       │                 │
│  │ ◼ Next                                    │                 │
│  └──────────────────────────────────────────┘                 │
│  side: trust logos · “We reply within 1 business day” · 🔒     │
│  → confirmation screen with reference # + next steps           │
```

### 5.12 Blog article
```
│ breadcrumb · category                                          │
│ H1 · author · date · read time                                 │
│ ▓/■ hero                                                       │
│ ┌ body (rich text, images, pull-quotes) ┐  │ sticky share    │
│ tags · author bio · related posts [3]                          │
│ CTA-BAND · FOOTER                                              │
```

### 5.13 Contact
```
│ ┌ form: name/company/region/message ┐  │ ┌ offices/phone/email ┐│
│ │ ◼ Send                            │  │ │ map · response note  ││
│ FOOTER                                                         │
```

### 5.14 404
```
│  ▓ subtle underwater visual                                    │
│  “This one drifted off course.”                                │
│  [search____]  · popular links: Product · Industries · Contact │
```

---

## 6. User Flows

### 6.1 Primary — Safety officer → Quote
```
Google (search: "man overboard training manikin SOLAS")
  → Home  OR  Industry/Compliance landing
  → reads value props / watches demo video
  → Product hub → picks model (or Compare / "help me choose")
  → Product detail → checks specs & compliance → downloads datasheet
  → clicks "Request a Quote"
  → Quote form (products → use case → region → contact)
  → Confirmation (reference #, expected reply time)
  → [email nurture]
```

### 6.2 Distributor discovery → local buy
```
Home/Product → "Find a Distributor"
  → Distributors map → filter by region
  → distributor found → contact distributor
      └─ if none → "Contact us" → Contact form (routed to regional sales)
```

### 6.3 Become a partner
```
Footer/Distributors → "Become a Partner"
  → value prop + tiers → Application form → Confirmation → [sales follow-up]
```

### 6.4 Researcher / trainer → resources
```
Home/Resources → Training or Videos
  → reads drill protocol / plays video
  → downloads checklist (open) or datasheet (gated → light form)
  → nurtured to Quote/Demo via CTA-band
```

### 6.5 "Help me choose" model helper
```
Product hub or Compare → "Which KARINA is right?"
  → Q1 use case (drill volume / rough sea / lifeguard / child)
  → Q2 environment (open sea / harbor / pool)
  → Q3 handling (crane/heli / manual)
  → recommended model card → Product detail / Quote
```

### 6.6 Mobile quick‑contact
```
Any page → sticky bottom "Request a Quote"
  → short mobile-optimized form (fewer steps) → Confirmation
```

### 6.7 Locale switch
```
Any page → 🌐 EN|HE → same page in target locale (URL locale-prefixed) → RTL/LTR applied
```

**Global flow rules:** every content page ends in a CTA‑band; every form ends in an explicit confirmation state; every dead end (404/no‑distributor) offers a next action.

---

## 7. UI Component Library

### 7.1 Global / layout
- Top bar (announcement — optional, dismissible)
- Sticky header + mega‑menu (desktop) / off‑canvas drawer (mobile)
- Locale switcher (EN/HE, extensible)
- Site search (overlay) + results component
- Breadcrumbs
- Sticky in‑page sub‑nav (anchor scrollspy)
- Footer (multi‑column) + newsletter form + social row
- CTA band (reusable conversion strip)
- Cookie consent banner
- Back‑to‑top button

### 7.2 Content blocks
- Hero (video / image / split variants)
- Value‑prop cards (icon + title + text)
- Feature row (image↔text alternating)
- Stat / counter block
- Product card
- Model comparison table (sticky header, mobile‑stack)
- Spec table (filterable, responsive)
- Industry tile / segment card
- Case‑study card + case‑study detail layout
- Blog card + article layout + pull‑quote
- Resource card (type badge: video/PDF/guide)
- Accordion (FAQ, drill protocols)
- Tabs
- Badge / certification chip
- Testimonial / quote block
- Timeline (About story)
- Interactive anatomy diagram (hotspots + tooltips)
- Interactive distributor map + region filter + list

### 7.3 Media
- Responsive image (art‑directed, `srcset`)
- Video hero (muted autoplay loop, poster, reduced‑motion fallback)
- Lightbox video player
- Image gallery / 360° viewer
- Logo strip / marquee

### 7.4 Forms & inputs
- Text / email / phone / textarea / select / country‑select
- Quantity stepper
- Multi‑step form wizard (progress indicator)
- Checkbox / radio / toggle
- File‑gate (email for gated download)
- Form validation states (inline errors, success)
- Confirmation / thank‑you panel
- Newsletter inline form
- Scheduling embed placeholder (demo booking)

### 7.5 Interactive / utility
- Buttons (primary / secondary / ghost / icon)
- Chips / filter pills
- Pagination / "Load more"
- Toast / notification
- Modal / drawer
- Tooltip / popover
- Skeleton loaders
- Empty states (no results, no distributor)
- Error states (404/500 content)
- Progress bar / scroll indicator

### 7.6 States to define for each component
Default · Hover · Focus (visible ring) · Active · Disabled · Loading · Error · Empty · RTL mirror.

---

## 8. Animation List

> All animations respect `prefers-reduced-motion` (disabled/minimized when set). Durations 150–600 ms, easing = ease‑out for entrances.

| # | Where | Animation | Trigger | Notes |
|---|-------|-----------|---------|-------|
| A1 | Hero | Background drill video slow zoom / subtle parallax | Load / scroll | Poster first; lazy video |
| A2 | Hero text | Staggered fade‑up of H1 → sub → CTAs | On load | 80 ms stagger |
| A3 | Header | Shrink/elevate on scroll; hide on scroll‑down, show on scroll‑up | Scroll | |
| A4 | Mega‑menu | Fade + slight slide‑down open | Hover/focus | |
| A5 | Value cards | Fade‑up on enter viewport | Scroll (IO) | |
| A6 | Stat counters | Count‑up numbers | Enter viewport | Once |
| A7 | Product cards | Image scale + shadow lift on hover | Hover | |
| A8 | Industry strip | Horizontal scroll snap + edge fade | Drag/scroll | |
| A9 | Feature rows | Alternating slide‑in (image L / text R) | Scroll | |
| A10 | Anatomy diagram | Hotspot pulse; tooltip pop; cutaway reveal | Hover/tap | Key differentiator |
| A11 | Comparison table | Column highlight on hover; diff‑cell emphasis | Hover | |
| A12 | Accordion (FAQ/drills) | Smooth height expand + chevron rotate | Click | |
| A13 | Tabs | Sliding active indicator | Click | |
| A14 | Distributor map | Pin drop + cluster expand; region hover highlight | Load/hover | |
| A15 | Multi‑step form | Step transition slide + progress fill | Next/Back | |
| A16 | Buttons | Press/ripple + focus ring; loading spinner | Interaction | |
| A17 | CTA band | Subtle wave/current motion background | Ambient | Very low intensity |
| A18 | Lightbox | Scale‑in open, backdrop fade | Open/close | |
| A19 | Toasts | Slide‑in from edge + auto‑dismiss | Event | |
| A20 | Page transitions | Fade / route progress bar | Navigation | Optional |
| A21 | Scroll progress | Thin top progress bar on articles | Scroll | |
| A22 | Newsletter success | Check‑mark draw animation | Submit | |
| A23 | Back‑to‑top | Fade in past 1 viewport; smooth scroll | Scroll | |
| A24 | Skeletons | Shimmer while loading media/lists | Load | |

**Motion principles:** purposeful, water/marine‑inspired but restrained; never block interaction; GPU‑friendly (transform/opacity only); full reduced‑motion parity.

---

## 9. Required Videos & Images

### 9.1 Video assets
| ID | Asset | Use | Spec / notes |
|----|-------|-----|--------------|
| V1 | **Hero drill film** (30–60 s, loopable, muted) | Home hero, product heroes | Cinematic MOB drill; multiple crops (16:9, 9:16, poster) |
| V2 | **Product demo — in water** (per model, 60–90 s) | Product detail, video library | Show buoyancy, recovery, visibility |
| V3 | **Recovery/lift sequence** (15–20 s loop) | Technology › Recovery | Crane/heli/manual variants |
| V4 | **Anatomy/tech explainer** (60–90 s, animated) | Technology | Cutaway, materials |
| V5 | **Industry mini‑films** (30–45 s ×8) | Industry pages | Shipping, offshore, cruise, SAR, etc. |
| V6 | **Testimonial clips** (30–60 s) | Case studies, home | Customer voice |
| V7 | **Training/drill protocol** (2–4 min ×N) | Resources › Training | Step‑by‑step |
| V8 | **Brand film** (60–90 s) | About | Mission/story |

**Video delivery:** compressed MP4/WebM, adaptive where possible, poster images, captions/subtitles (EN+HE), reduced‑motion static fallback.

### 9.2 Photography / image assets
| ID | Asset | Use |
|----|-------|-----|
| I1 | Product studio shots — each model, multiple angles + 360° frames | Product pages, cards |
| I2 | Detail/macro — materials, harness, hi‑vis, reflective, stitching | Technology, specs |
| I3 | In‑context action stills — deck, water, rough sea, night hi‑vis | Heroes, industries |
| I4 | Industry environment imagery (8 segments) | Industry pages, tiles |
| I5 | People/training in action (crew running drills) | Training, case studies |
| I6 | Accessories product shots | Accessories page |
| I7 | Anatomy cutaway illustration (annotated) | Technology interactive |
| I8 | World/region map artwork + pins | Distributors |
| I9 | Compliance/certification badge set | Compliance, product, home |
| I10 | Team/company/press images | About |
| I11 | Icon set (value props, features, categories) | Global |
| I12 | OG/social share images (per key page) | SEO/social |
| I13 | Favicon / app icons / logo variants (light/dark, RTL‑safe) | Global |

### 9.3 Documents (linked media)
Datasheets (per model, PDF, EN+HE) · full brochure · compliance docs · drill checklists · CAD/3D files · press/media kit.

**Asset guidelines:** consistent marine/professional look; hi‑vis colors true‑to‑product; safe‑area for text overlays on heroes; all imagery available in appropriate resolutions/formats (AVIF/WebP + fallback); alt text specified for every image (accessibility + SEO).

---

## 10. SEO Strategy

### 10.1 Objectives
Rank internationally for high‑intent B2B maritime‑safety queries; win category authority for "man overboard / MOB training manikin"; support multilingual reach.

### 10.2 Keyword themes (seed)
- **Transactional:** "man overboard training manikin", "MOB rescue dummy", "water rescue manikin for sale", "maritime rescue training doll", "SOLAS MOB drill equipment".
- **Segment:** "navy man overboard training", "offshore MOB drill manikin", "cruise ship rescue drill dummy", "lifeguard rescue manikin".
- **Informational (blog/resources):** "how to run a man overboard drill", "SOLAS MOB drill requirements", "MOB recovery techniques", "man overboard procedure checklist".
- **Comparison/brand:** "KARINA manikin", "[competitor] alternative", "best rescue training manikin".

Each primary page owns **one** keyword cluster; blog captures informational long‑tail feeding the funnel.

### 10.3 On‑page SEO (per page requirements)
- Unique `<title>` (≤60 chars) & meta description (≤155) — templated per page type, localized.
- One `<h1>` per page; logical H2/H3 outline mirroring sections.
- Descriptive, keyword‑aware, human URLs (already reflected in site map).
- Internal linking: hub‑and‑spoke (Product/Industries/Resources hubs → children; contextual cross‑links product↔industry↔compliance↔quote).
- Image alt text + descriptive filenames; captions where useful.
- Breadcrumb markup on all pages.

### 10.4 Technical SEO
- **Internationalization:** locale‑prefixed URLs (`/en/…`, `/he/…`), `hreflang` tags (incl. `x-default`), per‑locale sitemaps.
- XML sitemap(s) + `robots.txt`; clean canonical tags (self‑referencing; canonical for filtered/paginated views).
- Fast, Core‑Web‑Vitals‑optimized (see §12): LCP < 2.5s, INP < 200ms, CLS < 0.1.
- Mobile‑first, responsive, no interstitial traps.
- HTTPS, HTTP/2+, compression, image next‑gen formats, lazy‑loading.
- Handle pagination (blog), faceted filters (specs/videos) without index bloat (canonical/`noindex` filtered states as needed).
- Structured data (JSON‑LD): `Organization`, `Product` (+ `Offer`/aggregate where legit), `BreadcrumbList`, `FAQPage` (FAQ), `VideoObject` (videos), `Article` (blog), `LocalBusiness`/distributor data where applicable.

### 10.5 Content & authority
- Resource/blog engine targeting informational queries (drills, standards, techniques) → conversion CTAs.
- Case studies as social proof + long‑tail capture.
- Digital PR / backlinks from maritime‑safety, standards, training bodies, distributor sites.
- Video SEO (VideoObject schema, transcripts, hosting strategy, optional YouTube presence feeding site).

### 10.6 Local / international considerations
- `hreflang` correctness EN↔HE (and future locales); avoid duplicate‑content penalties via canonical + hreflang.
- Localized keywords (not literal translation) per market.
- Distributor pages can capture regional/local intent.

### 10.7 Measurement
Search Console (per locale), analytics goals mapped to G1–G5, event tracking (quote submit, datasheet download, video play, distributor lookup), rank tracking for the seed clusters.

### 10.8 Launch SEO checklist
Redirect map (if any legacy) · sitemap submitted · robots verified · structured data validated · titles/metas/hreflang audited · CWV pass · 404/500 handled · analytics & Search Console verified per locale.

---

## 11. Localization

- **Launch locales:** English (default, `x-default`) and Hebrew (RTL). Architecture must support adding ES/FR/DE/EL/ZH without rework.
- **RTL:** full mirroring for Hebrew — layout direction, nav, breadcrumbs, sliders, icons that imply direction, form alignment; numerals/units handled correctly; typography stack includes robust Hebrew fonts.
- **Content model:** every page, component string, alt text, meta, and document (datasheets) has an EN and HE variant; fallback to EN if a locale string is missing.
- **Locale switch:** persists selection; switches to the equivalent page (not home) where it exists; URL locale‑prefixed.
- **Translation:** professional, market‑adapted (transcreation for headlines/CTAs, not literal); consistent terminology glossary (marine/safety terms).
- **Formats:** dates, numbers, phone, address formats localized; contact routing by region.

---

## 12. Technical, Accessibility & Performance

*(Non‑build requirements the future implementation must satisfy — stated here as spec constraints.)*

- **Accessibility:** target **WCAG 2.2 AA** — semantic landmarks, keyboard operability, visible focus, color contrast, alt text, captioned video, form labels/errors, skip‑link, reduced‑motion support, ARIA only where needed; published Accessibility Statement.
- **Performance:** Core Web Vitals green; image/video optimization; code‑split; lazy‑load below‑fold media; CDN; preconnect/preload critical assets; total weight budget per page.
- **Responsive:** mobile‑first; breakpoints for phone/tablet/desktop/wide; touch targets ≥44px.
- **Browser support:** current + 1 previous of major browsers; graceful degradation.
- **Privacy/compliance:** cookie consent, GDPR‑ready forms (consent, data‑use), privacy policy; form spam protection.
- **Analytics & tracking:** event schema for KPI goals; consent‑gated.
- **CMS:** structured, localizable content types (page, product, industry, resource, case study, blog post, distributor, FAQ, download) — selection is phase 2.
- **Security:** HTTPS, form validation/sanitization, rate‑limiting on submissions.

---

## 13. Appendix

### 13.1 Content inventory (to be produced before build)
Copy for every page/section · model spec data · compliance claims (legal‑reviewed) · all V/I assets (§9) · datasheets & documents · distributor list · translations (EN/HE).

### 13.2 Conversion inventory
Primary: Request a Quote. Secondary: Book a Demo, Download datasheet, Find a Distributor, Become a Partner, Newsletter. Each needs a form, confirmation, and routing/nurture definition.

### 13.3 Open questions (need stakeholder input)
1. Confirm the exact product line‑up & model names (Pro/Lite/Cadet/SAR are proposed).
2. Confirm real compliance/certification claims permitted in marketing.
3. Is a phase‑2 e‑commerce/accessories store desired?
4. Launch locales beyond EN/HE?
5. Existing brand assets (logo, colors, fonts) or design from scratch?
6. Distributor data source & partner program details.
7. Preferred demo‑scheduling / CRM / email tools for lead routing.
8. Company/manufacturer name & "About" content.

### 13.4 Suggested build phasing (informational)
- **Phase 1 (MVP):** Home, Product (hub + 4 details + compare), Industries (hub + 8), Specifications, Compliance, Resources (hub + videos + downloads + FAQ), Distributors, About, Quote/Demo/Contact, legal, EN+HE.
- **Phase 2:** Blog/case‑study engine at scale, partner portal, accessories store, added locales, advanced personalization.

---

*End of English specification. Hebrew mirror: `karina-website-spec-HE.md`.*
