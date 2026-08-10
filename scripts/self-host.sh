#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-}"
MODE="${2:-multi}"

case "$MODE" in
  multi)
    SAMPLE_FILE="multi_user.sample.env"
    ENV_FILE=".env.multi-user"
    COMPOSE_FILE="docker-compose.multi-user.yml"
    ;;
  single)
    SAMPLE_FILE="single_user.sample.env"
    ENV_FILE=".env.single-user"
    COMPOSE_FILE="docker-compose.single-user.yml"
    ;;
  *)
    echo "Mode must be 'multi' or 'single'." >&2
    exit 2
    ;;
esac

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

replace_value() {
  local key="$1" value="$2" temporary
  temporary="$(mktemp "${TMPDIR:-/tmp}/learnerverse-env.XXXXXX")"
  awk -F= -v wanted="$key" -v replacement="$value" '
    $1 == wanted { print wanted "=" replacement; next }
    { print }
  ' "$ENV_FILE" > "$temporary"
  mv "$temporary" "$ENV_FILE"
}

setup() {
  local database_password encryption_key
  if [[ -e "$ENV_FILE" ]]; then
    echo "$ENV_FILE already exists; it was not changed."
    return
  fi
  if ! command -v openssl >/dev/null 2>&1; then
    echo "OpenSSL is required to generate installation secrets." >&2
    exit 1
  fi

  cp "$SAMPLE_FILE" "$ENV_FILE"
  database_password="$(openssl rand -hex 24)"
  replace_value POSTGRES_PASSWORD "$database_password"
  replace_value DATABASE_URL "postgresql+asyncpg://learnerverse:${database_password}@db:5432/learnerverse"
  replace_value SECRET_KEY "$(openssl rand -hex 32)"
  replace_value MCP_PAT_SIGNING_KEY "$(openssl rand -hex 32)"
  encryption_key="$(openssl rand -base64 32 | tr '+/' '-_' | tr -d '\n')"
  replace_value CREDENTIAL_ENCRYPTION_KEYS "$encryption_key"

  echo "Created $ENV_FILE with unique database and signing secrets."
  if [[ "$MODE" == "multi" ]]; then
    echo "Next: add the Auth0 values, public school URL, admin email, and at least one AI provider key."
  else
    echo "Optional: add an AI provider key, then run: ./scripts/self-host.sh up single"
  fi
}

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

case "$COMMAND" in
  setup)
    setup
    ;;
  check)
    "$ROOT_DIR/scripts/self-host-check.sh" "$MODE"
    ;;
  up)
    "$ROOT_DIR/scripts/self-host-check.sh" "$MODE"
    compose up --build -d
    compose ps
    ;;
  down)
    compose down
    ;;
  restart)
    "$ROOT_DIR/scripts/self-host-check.sh" "$MODE"
    compose up --build -d
    compose ps
    ;;
  status)
    compose ps
    ;;
  logs)
    compose logs --tail=200 -f
    ;;
  *)
    echo "Usage: $0 {setup|check|up|down|restart|status|logs} [multi|single]" >&2
    exit 2
    ;;
esac
