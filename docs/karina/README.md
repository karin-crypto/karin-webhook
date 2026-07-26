# KARINA — Website Specification (Characterization) Package

> **Status:** Specification / Characterization only. **No code, no deployment, no publishing.**
> This package defines *what* the KARINA international website must be and do. It does **not** implement it.

**Product:** KARINA — *The Ultimate Maritime Rescue Dummy* — a **single**, life‑size (158 cm), life‑weight (70 kg) female‑form **Man‑Overboard (MOB) training mannequin**. Patent registered. Debuting at the **Monaco Yacht Show, September 2026**. Inventor: **Karin Keren**.

**Scope:** A standalone **international** marketing & lead‑generation website, independent from any existing site/system.

**Source of truth:** [`karina-brand-facts-SOURCE-OF-TRUTH.md`](./karina-brand-facts-SOURCE-OF-TRUTH.md) — real product facts, specs, branding, and contact, extracted from the live KARINA landing page. All other documents defer to it.

---

## Documents in this package

| File | Language | Purpose |
|------|----------|---------|
| `karina-brand-facts-SOURCE-OF-TRUTH.md` | HE + EN | **Authoritative** product/brand facts (from live site). |
| `karina-website-spec-EN.md` | English 🇬🇧 | Full specification v2.0 — master reference. |
| `karina-website-spec-HE.md` | Hebrew 🇮🇱 (RTL) | Full specification v2.0 — mirror. |
| `media-library/` | HE + EN | Categorized media catalog + registry + missing‑assets list. |
| `README.md` | English | This overview / index. |

Both spec files contain the **same 11 required deliverables**: Site Map · All Pages · All Sections · Navigation Hierarchy · Wireframes · User Flows · UI Component Library · Animation List · Required Videos & Images · SEO Strategy · delivered in EN + HE.

## Confirmed facts (v2.0 — replaces v1.0 assumptions)

- **F1 — Single product.** KARINA is one life‑size female‑form MOB mannequin (158 cm · 70 kg dry · 55–65 kg in water). *Not* a multi‑model family.
- **F2 — IP.** **Patent registered**; prototype complete; production ready. **No SOLAS/IMO certification is claimed** (any future cert claim must be legally reviewed).
- **F3 — Conversion.** B2B lead‑gen: **Request Information** + **Book a Demonstration**. No e‑commerce.
- **F4 — Audiences (8):** Naval & Coast Guard · Sailing Schools & Skipper Courses · Superyacht Crew · Maritime Police & Rescue · Lifeguard · Offshore & Oil‑Platform · Maritime Academies · Cruise & Ferry.
- **F5 — Launch anchor:** Monaco Yacht Show, September 2026.
- **F6 — Brand:** Navy `#0d1b2e` + Gold `#c9a84c` + Cream; Cormorant Garamond + Montserrat; gold text wordmark (no vector logo yet).
- **F7 — Founder:** Karin Keren (Entrepreneur · Skipper · Inventor). Contact: `karin@karinkeren.com` · `+972‑54‑624‑8546`.
- **F8 — Languages at launch:** EN (default, `x-default`) + HE (RTL); extensible to FR/IT/ES/EL.

## Media status

Live site references **2 images** (hero + technical diagram, on Base44 CDN) — cataloged as HAVE with live URLs. `public/images/karin.jpg` cataloged under Founder. All other assets are listed as needed in [`media-library/missing-assets.md`](./media-library/missing-assets.md) with filename · format · dimensions.

> **Access note:** the live domain (`yachting.karinkeren.com`) and Base44 CDN are blocked by this environment's egress policy. Facts/assets above were recovered from the account's Google Drive copy of the landing page. To pull the live binaries directly, allowlist the domain and run in a fresh session.

## Out of scope for this phase

- Final visual design comps · final copywriting
- CMS selection & build; front‑end/back‑end code
- Hosting, DNS, deployment, analytics account setup
