#!/bin/bash
# SessionStart hook — install Karin's version-controlled Claude skills into the live skills
# directory so they trigger in every session (including Claude Code on the web).
# Idempotent and safe to run repeatedly.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
SRC="$PROJECT_DIR/skills"
DEST="${HOME}/.claude/skills"

if [ -d "$SRC" ]; then
  mkdir -p "$DEST"
  # Copy each skill folder (dirs only — skip skills/README.md).
  for skill in "$SRC"/*/; do
    [ -d "$skill" ] || continue
    cp -r "$skill" "$DEST/"
  done
fi
