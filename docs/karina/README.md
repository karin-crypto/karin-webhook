# KARINA — Website Package

> ## ✅ Current direction — **KARINA · Marine Robot Ambassador**
> *Deep. Smart. Human. · Built to explore. Designed to protect.*
> The project has committed to the **Marine Robot Ambassador** direction. The **built site** is the primary deliverable: [`site/`](./site/) (self‑contained `index.html` + real client imagery + concept films).
> **Live preview:** https://claude.ai/code/artifact/a4b4f98c-e4b2-4b9d-b995-144b360f88ae

**Product (current):** KARINA — an AI‑powered **marine‑robot ambassador**: autonomous navigation, biometric + behavioral intelligence, real‑time distress detection. Deep‑water rated. Creator: **Karin Keren**. Contact: `karin@karinkeren.com` · WhatsApp `+972‑54‑624‑8546`.

---

### Package map
| Path | What it is | Reflects current direction? |
|---|---|---|
| [`site/`](./site/) | **The built website** (Marine Robot Ambassador) — primary deliverable | ✅ Yes |
| [`media-library/`](./media-library/) | Categorized media catalog + registry; client concept posters & films under `assets/08-concept-vision/` | ✅ Yes (assets) |
| `karina-website-spec-EN.md` / `-HE.md` | Full site specification (site map, wireframes, flows, UI, SEO) | ⚠️ Earlier *rescue‑mannequin* framing — reusable structure, copy needs reconciliation |
| `karina-brand-facts-SOURCE-OF-TRUTH.md` | Facts from the original live landing page | ⚠️ Documents the earlier *mannequin* concept |
| `content/` | Page copy (EN/HE) + spec sheet | ⚠️ Written for the *mannequin* concept |

> **Note on the earlier docs:** the spec, brand‑facts and content files were produced for an earlier *MOB rescue‑training‑mannequin* concept (from the original live landing page). They are kept as a valid exploration and a reusable structural blueprint. Say the word and I'll reconcile their copy to the Marine Robot Ambassador direction.

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
