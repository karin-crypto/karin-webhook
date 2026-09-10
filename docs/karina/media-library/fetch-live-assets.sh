#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# KARINA — fetch live media assets from the source of truth
#
# Downloads the live KARINA images (currently hosted on the Base44 CDN, as
# referenced by the live site) into the Media Library, with the canonical
# target filenames used in media-registry.csv.
#
# WHEN TO RUN: only works once `media.base44.com` (and/or the KARINA domain)
# is allowed by the environment's network/egress policy. If it is still
# blocked you will get HTTP 000 / "403 CONNECT" — that is the egress block,
# not a bug in this script. Allowlist the host and run in a FRESH session.
#
# SAFE: only writes into assets/… ; never deletes or moves anything.
# IDEMPOTENT: re-running re-downloads and overwrites the same target files.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail

# Resolve paths relative to this script (so it works from any CWD)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSETS="$SCRIPT_DIR/assets"

CDN="https://media.base44.com/images/public/whatsapp/69c1a894bc89d9ff0d3d5d28/your_agent/69c1a894bc89d9ff0d3d5d29"

# asset_id | source URL | target path (relative to assets/)
ASSETS_LIST=(
  "KRN-HERO-001|$CDN/cae9d816c_whatsapp_image_27343962475227459.jpg|01-hero/karina_hero_floating-sea.jpg"
  "KRN-TECH-001|$CDN/5a5e53dc1_whatsapp_image_1017938654516597.jpg|03-technology/karina_tech_diagram.jpg"
)

ok=0; fail=0

echo "KARINA — fetching live media assets"
echo "target root: $ASSETS"
echo

for row in "${ASSETS_LIST[@]}"; do
  IFS='|' read -r id url rel <<< "$row"
  out="$ASSETS/$rel"
  mkdir -p "$(dirname "$out")"
  echo "→ [$id] $rel"

  http=$(curl -fsSL \
      --retry 4 --retry-delay 2 --retry-all-errors \
      --connect-timeout 20 --max-time 120 \
      -A "Mozilla/5.0" \
      -w '%{http_code}' \
      -o "$out.tmp" "$url" 2>/dev/null)
  rc=$?

  if [ $rc -ne 0 ] || [ "$http" != "200" ]; then
    echo "   ✗ FAILED (curl rc=$rc, http=$http). Host likely still blocked by egress policy."
    rm -f "$out.tmp"
    fail=$((fail+1))
    continue
  fi

  # Verify it is actually an image
  ctype=$(file --mime-type -b "$out.tmp" 2>/dev/null || echo "unknown")
  case "$ctype" in
    image/*)
      mv -f "$out.tmp" "$out"
      bytes=$(wc -c < "$out" | tr -d ' ')
      echo "   ✓ saved ($ctype, $bytes bytes)"
      ok=$((ok+1))
      ;;
    *)
      echo "   ✗ downloaded content is not an image ($ctype) — kept as $out.reject for inspection"
      mv -f "$out.tmp" "$out.reject"
      fail=$((fail+1))
      ;;
  esac
  echo
done

echo "──────────────────────────────────────────"
echo "done: $ok downloaded, $fail failed"
if [ $fail -eq 0 ] && [ $ok -gt 0 ]; then
  echo
  echo "Next steps:"
  echo "  1) git add docs/karina/media-library/assets && git commit"
  echo "  2) In media-registry.csv, the two rows are already HAVE; you may append"
  echo "     the local path to their location_or_notes column."
  echo "  3) Re-scan the live site for any additional/updated assets."
fi
exit 0
