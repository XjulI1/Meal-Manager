#!/bin/sh
# Container entrypoint:
#   1. Validate that mandatory env vars are present.
#   2. Apply pending Drizzle migrations against DATABASE_URL.
#   3. Exec the CMD (the standalone Nitro server) so it becomes PID 1
#      under tini and receives SIGTERM cleanly.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "FATAL: DATABASE_URL is not set." >&2
  exit 1
fi

if [ -z "${NUXT_SESSION_PASSWORD:-}" ]; then
  echo "FATAL: NUXT_SESSION_PASSWORD is not set." >&2
  exit 1
fi

echo "▶ Applying database migrations (drizzle-kit migrate)..."
./node_modules/.bin/drizzle-kit migrate

echo "▶ Migrations done. Starting application: $*"
exec "$@"
