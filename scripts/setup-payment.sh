#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# setup-payment.sh — Link the private payment submodule into the
# main codebase.  Run this after `git submodule update --init`.
#
# When the private/ submodule is present, this script replaces the
# stub files in the public repo with symlinks to the real payment
# gateway implementations.
#
# Usage:
#   ./scripts/setup-payment.sh          # link payment module
#   ./scripts/setup-payment.sh --undo   # restore stubs
# ─────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PRIVATE_DIR="$ROOT_DIR/private"

# Map: public-repo path → private-repo path (relative to ROOT_DIR)
declare -a LINK_MAP=(
  # Backend
  "backend/app/services/subscription_service.py|private/backend/app/services/subscription_service.py"
  "backend/app/api/v1/endpoints/subscription.py|private/backend/app/api/v1/endpoints/subscription.py"
  # Frontend
  "frontend/src/hooks/useSubscription.ts|private/frontend/src/hooks/useSubscription.ts"
  "frontend/src/components/subscription/ProGateDialog.tsx|private/frontend/src/components/subscription/ProGateDialog.tsx"
  "frontend/src/components/subscription/CongratulationsDialog.tsx|private/frontend/src/components/subscription/CongratulationsDialog.tsx"
  "frontend/src/components/home/PricingSection.tsx|private/frontend/src/components/home/PricingSection.tsx"
  "frontend/src/pages/PricingPage.tsx|private/frontend/src/pages/PricingPage.tsx"
  "frontend/src/pages/RenewPage.tsx|private/frontend/src/pages/RenewPage.tsx"
  "frontend/src/types/subscription.ts|private/frontend/src/types/subscription.ts"
)

undo_links() {
  echo "🔄 Removing symlinks..."
  local restored=0
  for entry in "${LINK_MAP[@]}"; do
    target="${entry%%|*}"
    full_target="$ROOT_DIR/$target"
    if [ -L "$full_target" ]; then
      rm "$full_target"
      restored=$((restored + 1))
      echo "  🗑  Removed symlink: $target"
    else
      echo "  ⏭  Not a symlink, skipping: $target"
    fi
  done

  if [ "$restored" -gt 0 ]; then
    echo ""
    echo "Restoring stub files from git..."
    (cd "$ROOT_DIR" && git checkout -- \
      frontend/src/types/subscription.ts \
      frontend/src/hooks/useSubscription.ts \
      frontend/src/components/subscription/ProGateDialog.tsx \
      frontend/src/components/subscription/CongratulationsDialog.tsx \
      frontend/src/components/home/PricingSection.tsx \
      frontend/src/pages/PricingPage.tsx \
      frontend/src/pages/RenewPage.tsx \
      2>/dev/null) && echo "  ✅ Frontend stubs restored from git" \
                    || echo "  ⚠️  Could not restore stubs from git. Re-run: git checkout -- <files>"
    # Backend files have no stubs — the try/except ImportError handles them
    echo ""
  fi

  echo "✅ Done. Payment gateway is disabled."
  echo "   Remember to set PAYMENT_GATEWAY_ENABLED=false in your .env"
}

create_links() {
  if [ ! -d "$PRIVATE_DIR" ]; then
    echo "❌ Private submodule not found at: $PRIVATE_DIR"
    echo "   Run: git submodule update --init"
    exit 1
  fi

  echo "🔗 Linking payment module from private submodule..."
  for entry in "${LINK_MAP[@]}"; do
    target="${entry%%|*}"
    source="${entry##*|}"
    full_target="$ROOT_DIR/$target"
    full_source="$ROOT_DIR/$source"

    if [ ! -f "$full_source" ]; then
      echo "  ❌ Source not found: $source"
      continue
    fi

    # Remove existing file (stub or broken symlink)
    if [ -f "$full_target" ] || [ -L "$full_target" ]; then
      rm "$full_target"
    fi

    # Create relative symlink
    target_dir="$(dirname "$full_target")"
    rel_source="$(python3 -c "import os.path; print(os.path.relpath('$full_source', '$target_dir'))")"
    ln -s "$rel_source" "$full_target"
    echo "  ✅ Linked: $target → $rel_source"
  done

  echo ""
  echo "✅ Payment module linked. Set PAYMENT_GATEWAY_ENABLED=true to activate."
}

# ── Main ──────────────────────────────────────────────────────
case "${1:-}" in
  --undo|-u)
    undo_links
    ;;
  *)
    create_links
    ;;
esac
