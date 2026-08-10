#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

echo "Starting server..."
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers "${UVICORN_WORKERS:-1}"
