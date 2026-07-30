# 3. Design System

**Design language:** luxury technology — minimalistic, modern, fast, global.
Large typography, an ocean-inspired palette, glass effects only where
appropriate, and high accessibility throughout.

Source of truth:
- Tokens in TypeScript → [`src/lib/design/tokens.ts`](../src/lib/design/tokens.ts)
- Tailwind theme → [`tailwind.config.ts`](../tailwind.config.ts)
- Semantic CSS variables (theme-aware) → [`src/app/globals.css`](../src/app/globals.css)

## Color — ocean-inspired palette

| Token | Hex | Role |
|-------|-----|------|
| `abyss` | `#04070D` | Deepest background (default theme) |
| `deep` | `#0A1524` | Surface / panels |
| `ocean` | `#0E2A47` | Borders, depth |
| `marine` | `#1E6FB8` | Primary brand blue |
| `current` | `#2E8BC0` | Secondary blue |
| `aqua` | `#38C6D9` | Accent / interactive highlight |
| `foam` | `#CFE3EC` | Light text on dark |
| `mist` | `#EAF2F6` | Lightest / light-theme background |
| `beacon` | `#FF9F45` | Safety "signal" accent — used sparingly |

### Semantic tokens (theme-aware)

Driven by CSS custom properties so the whole system re-themes at the `:root`.
The default theme is **deep-ocean (dark)**; a **light** theme is provided for
accessibility and future user preference (`:root[data-theme="light"]`).

`background` · `surface` · `foreground` · `muted` · `border` · `primary` ·
`accent`

All are HSL triplets, enabling Tailwind's `<alpha-value>` (`bg-accent/10`, etc.).

## Typography

- **Display:** Sora — headings, geometric and confident.
- **Body/UI:** Inter — highly legible, neutral.
- Loaded via `next/font` and exposed as `--font-display` / `--font-sans`.

**Large-typography scale** (fluid, via `clamp`):

| Token | Size |
|-------|------|
| `text-display` | `clamp(2.75rem, 6vw, 5.5rem)` |
| `text-headline` | `clamp(2rem, 4vw, 3.5rem)` |
| `text-title` | `clamp(1.5rem, 2.4vw, 2.25rem)` |
| `text-body` | `1.0625rem` |
| `text-small` | `0.9375rem` |

Headings use tight tracking and `text-balance`; body copy is capped at
`max-w-prose` (44rem) for readability.

## Spacing & layout

- **Content width:** `max-w-content` (72rem), gutters `px-5 sm:px-8`.
- **Section rhythm:** `clamp(4.5rem, 9vw, 9rem)` vertical padding (`Section`).
- **Radii:** generous — `xl`/`2xl`/`3xl` (1–2rem) for a soft, premium feel.

## Glass & surfaces

Glass is **intentional and restrained** (per the brief — "glass effects only
where appropriate"):

- `.glass` = translucent surface + `backdrop-blur-glass` (18px) + hairline white
  border + soft shadow.
- Used for: header, floating assistant launcher, panels/cards, CTA band.
- Not used as a default background — most surfaces are solid for contrast.

`.ocean-wash` provides a subtle radial gradient backdrop.

## Motion

- Calm, ocean-like easing: `--ease-swell` = `cubic-bezier(0.22, 1, 0.36, 1)`.
- Entrances: `animate-fade-up`; ambient: `animate-drift`.
- **All motion respects `prefers-reduced-motion`** (globally disabled there).

## Elevation & effects

- `shadow-glass` for lifted surfaces; `shadow-glow` (aqua) for primary hover.

## Accessibility standards

- Target **WCAG 2.2 AA**. Palette chosen for contrast in both themes.
- Visible `:focus-visible` rings on every interactive element.
- Skip-to-content link; semantic landmarks (`header`/`main`/`footer`/`nav`).
- `color-scheme` set per theme; `theme-color` meta for mobile chrome.
- No information conveyed by color alone.

## Iconography & imagery (Phase 2+)

- A single, consistent line-icon set (added in Phase 2).
- Imagery guidance: authentic maritime photography/illustration; no stock that
  implies fake endorsements. No imagery is shipped in Phase 1.
