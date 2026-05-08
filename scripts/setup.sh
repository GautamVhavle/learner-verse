#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# setup.sh — First-time project setup.
# Copies sample.env files if they don't already exist.
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

copy_if_missing() {
  local src="$1" dest="$2"
  if [ -f "$dest" ]; then
    echo "  ⏭  $dest already exists, skipping"
  else
    cp "$src" "$dest"
    echo "  ✅ Created $dest"
  fi
}

echo "🔧 Setting up LearnerVerse..."
echo ""

copy_if_missing "$ROOT_DIR/backend/sample.env" "$ROOT_DIR/.env"
copy_if_missing "$ROOT_DIR/frontend/sample.env" "$ROOT_DIR/frontend/.env"

echo ""
echo "✅ Done! Next steps:"
echo "   1. Edit .env and frontend/.env with your settings"
echo "   2. Run 'make docker' to start with Docker"
echo "      or see README.md for manual setup"
