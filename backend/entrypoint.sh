#!/bin/sh
set -e

echo "Running database migrations..."
uv run alembic upgrade head

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Starting server..."
exec uv run uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-1}"
