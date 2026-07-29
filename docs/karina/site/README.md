# KARINA — Website (hand-built static site)

**Direction:** KARINA — **Marine Robot Ambassador** · *Deep. Smart. Human. · Built to explore. Designed to protect.*
Premium, self-contained single-page site. Deep-ocean palette (abyss blue + cyan HUD + amber alert), monospace telemetry, bilingual **EN/HE with full RTL**, restrained HUD/scanline motion. Uses the real concept imagery provided by the client.

## Files
- `index.html` — the complete site (inline CSS + JS; no build step, no dependencies).
- `assets/karina_ambassador.jpg`, `assets/karina_biometric.jpg` — optimized web imagery (cropped from the supplied concept posters; originals in `../media-library/assets/08-concept-vision/`).
- `assets/video/karina_concept_video_01–03.mp4` + `.webm` — concept films, web-encoded (H.264/MP4 + VP9/WebM) for all-browser playback, with `poster_01–03.jpg` stills. Originals (`.mov`) are preserved in `../media-library/assets/08-concept-vision/`.
- `_robot_body.html` — body-only source template (image tokens) used to generate `index.html` and the preview.

## Live preview
Published as an Artifact during the build session: **https://claude.ai/code/artifact/a4b4f98c-e4b2-4b9d-b995-144b360f88ae**
The preview embeds the two images inline (data URIs) so they render despite the Artifact CSP; brand fonts fall back to a system sans stack there. The films are placeholders in the preview and play from `assets/video/` when hosted.

## Hosting
Serve `index.html` on any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, or this repo's Railway host). On a normal host: Google Fonts (Montserrat) load, and images/films resolve from `assets/`.

**Video:** films ship web-encoded as **MP4 (H.264)** + **WebM (VP9)** with poster stills — playable in Chrome, Firefox, Safari and Edge. Each film tile shows its poster and plays inline on click (mp4 with webm fallback).

## Content & claims
Copy and capability claims (depth rating 1000 m, autonomous AI navigation, biometric + behavioral analytics, real-time distress detection) are taken directly from the client-supplied concept materials. Coordinates/telemetry mirror the posters (Mediterranean Sea). Contact: karin@karinkeren.com · WhatsApp +972-54-624-8546.

> A previous build explored a "MOB rescue training mannequin" direction; the project has since committed to the **Marine Robot Ambassador** direction (this site). The earlier spec/copy docs under `docs/karina/` still describe the mannequin framing and should be reconciled to this direction if they are to be kept.
