#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-multi}"
case "$MODE" in
  multi)
    ENV_FILE=".env.multi-user"
    COMPOSE_FILE="docker-compose.multi-user.yml"
    ;;
  single)
    ENV_FILE=".env.single-user"
    COMPOSE_FILE="docker-compose.single-user.yml"
    ;;
  *)
    echo "Usage: $0 [multi|single]" >&2
    exit 2
    ;;
esac

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE does not exist. Run: ./scripts/self-host.sh setup $MODE" >&2
  exit 1
fi

errors=0
warnings=0

error() {
  echo "ERROR: $*" >&2
  errors=$((errors + 1))
}

warn() {
  echo "WARN:  $*" >&2
  warnings=$((warnings + 1))
}

value_for() {
  awk -F= -v wanted="$1" '
    $1 == wanted {
      value = substr($0, index($0, "=") + 1)
      sub(/\r$/, "", value)
      print value
      exit
    }
  ' "$ENV_FILE"
}

require_value() {
  local key="$1" value
  value="$(value_for "$key")"
  if [[ -z "$value" ]]; then
    error "$key is required in $ENV_FILE"
  elif [[ "$value" == *change-me* || "$value" == *your-tenant* || "$value" == *your-auth0* || "$value" == *xxxxxxxx* ]]; then
    error "$key still contains a sample placeholder"
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  error "Docker is not installed"
elif ! docker compose version >/dev/null 2>&1; then
  error "Docker Compose v2 is not available"
fi

for key in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB DATABASE_URL SECRET_KEY; do
  require_value "$key"
done

database_url="$(value_for DATABASE_URL)"
if [[ -n "$database_url" && "$database_url" != *"@db:5432/"* ]]; then
  error "DATABASE_URL must use the Compose database hostname db:5432"
fi

secret_key="$(value_for SECRET_KEY)"
if (( ${#secret_key} < 32 )); then
  error "SECRET_KEY must be at least 32 characters"
fi

if [[ "$(value_for PAYMENT_GATEWAY_ENABLED)" != "false" ]]; then
  error "PAYMENT_GATEWAY_ENABLED must be false for the supported self-hosted build"
fi

if [[ "$(value_for PRODUCTION_PIPELINE_ENABLED)" == "true" ]]; then
  error "PRODUCTION_PIPELINE_ENABLED is experimental and is not supported by this Compose stack"
fi

if [[ "$(value_for MCP_ENABLED)" == "true" ]]; then
  require_value MCP_PAT_SIGNING_KEY
  require_value CREDENTIAL_ENCRYPTION_KEYS
  mcp_signing_key="$(value_for MCP_PAT_SIGNING_KEY)"
  if (( ${#mcp_signing_key} < 32 )); then
    error "MCP_PAT_SIGNING_KEY must be at least 32 characters"
  fi
  credential_keys="$(value_for CREDENTIAL_ENCRYPTION_KEYS)"
  IFS=',' read -r -a credential_key_list <<< "$credential_keys"
  for credential_key in "${credential_key_list[@]}"; do
    credential_key="${credential_key//[[:space:]]/}"
    if [[ ! "$credential_key" =~ ^[A-Za-z0-9_-]{43}=$ ]]; then
      error "each CREDENTIAL_ENCRYPTION_KEYS entry must be a 32-byte URL-safe base64 Fernet key"
      break
    fi
  done
fi

api_url="$(value_for VITE_API_BASE_URL)"
if [[ "$api_url" != "/api/v1" ]]; then
  warn "legacy VITE_API_BASE_URL is ignored; self-hosted builds are pinned to the safe /api/v1 same-origin route"
fi

supabase_url="$(value_for SUPABASE_URL)"
supabase_key="$(value_for SUPABASE_SERVICE_KEY)"
if [[ -n "$supabase_url" && -z "$supabase_key" ]] || [[ -z "$supabase_url" && -n "$supabase_key" ]]; then
  error "SUPABASE_URL and SUPABASE_SERVICE_KEY must either both be set or both be empty"
fi

if [[ "$MODE" == "multi" ]]; then
  if [[ "$(value_for SINGLE_USER_MODE)" != "false" ]] || [[ "$(value_for VITE_SINGLE_USER_MODE)" != "false" ]]; then
    error "multi-user mode requires SINGLE_USER_MODE=false in both backend and frontend"
  fi
  for key in AUTH0_DOMAIN AUTH0_AUDIENCE AUTH0_ISSUER VITE_AUTH0_DOMAIN VITE_AUTH0_CLIENT_ID VITE_AUTH0_AUDIENCE; do
    require_value "$key"
  done
  if [[ "$(value_for AUTH0_DOMAIN)" != "$(value_for VITE_AUTH0_DOMAIN)" ]]; then
    error "AUTH0_DOMAIN and VITE_AUTH0_DOMAIN must match"
  fi
  if [[ "$(value_for AUTH0_AUDIENCE)" != "$(value_for VITE_AUTH0_AUDIENCE)" ]]; then
    error "AUTH0_AUDIENCE and VITE_AUTH0_AUDIENCE must match"
  fi
  expected_issuer="https://$(value_for AUTH0_DOMAIN)/"
  if [[ "$(value_for AUTH0_ISSUER)" != "$expected_issuer" ]]; then
    error "AUTH0_ISSUER must be $expected_issuer"
  fi
else
  if [[ "$(value_for SINGLE_USER_MODE)" != "true" ]] || [[ "$(value_for VITE_SINGLE_USER_MODE)" != "true" ]]; then
    error "single-user mode requires SINGLE_USER_MODE=true in both backend and frontend"
  fi
  warn "single-user mode has no login boundary; expose it only to a trusted user/network"
fi

if [[ -z "$(value_for OPENROUTER_API_KEY)" && -z "$(value_for GEMINI_API_KEY)" ]]; then
  warn "no AI provider key is configured; LiVi and AI quiz generation will be unavailable"
fi

if [[ -z "$(value_for SUPERADMIN_EMAILS)" && "$MODE" == "multi" ]]; then
  warn "SUPERADMIN_EMAILS is empty; no account will have the school administration dashboard"
fi

if (( errors == 0 )); then
  if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" config --quiet; then
    error "Docker Compose configuration validation failed"
  fi
fi

if (( errors > 0 )); then
  echo "Self-host preflight failed with $errors error(s) and $warnings warning(s)." >&2
  exit 1
fi

echo "Self-host preflight passed for $MODE mode with $warnings warning(s)."
