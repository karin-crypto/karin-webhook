# KARINA — Website (hand-built static site)

Premium, self-contained single-page site implementing the KARINA spec. Navy + Gold brand, Cormorant Garamond + Montserrat, bilingual **EN/HE with full RTL**, restrained scroll animations.

## Files
- `index.html` — the complete site. Fully self-contained (inline CSS + JS). No build step, no dependencies.

## Preview
A live preview was published as an Artifact during the build session. In the Artifact, external assets are blocked by CSP, so brand fonts fall back to a serif/sans system stack and the two live photos don't load — the design is built to look intentional without them.

## Hosting (real fonts + live photos)
Host `index.html` on any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, or this repo's Railway host). When served from a normal host:
- **Google Fonts load** → real Cormorant Garamond + Montserrat.
- **Live photography** can be wired in: the two live images referenced by the site live on the Base44 CDN (see `../media-library/media-registry.csv`, rows `KRN-HERO-001` / `KRN-TECH-001`). Drop real product/hero imagery into the hero and a Technology "plate" as desired.

## What's real vs. pending
- **Real now:** all copy (EN/HE), specs, branding, structure, animations, buoyancy diagram, contact (email + WhatsApp), Monaco framing, patent-accurate claims.
- **Pending media:** professional photography, in-water demo video, a vector logo and icon set — the biggest levers for a top-tier finish. See `../media-library/missing-assets.md`.

## Claims discipline
Patent **registered**; KARINA is presented as a **training aid**. No SOLAS/IMO certification is claimed anywhere. Keep it that way until any certification is legally confirmed.
