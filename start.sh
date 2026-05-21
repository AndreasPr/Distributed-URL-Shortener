#!/usr/bin/env sh
set -euo pipefail

echo "ABOUT TO START: $(date -u)"
echo "ENV: PORT=${PORT:-not-set}"
echo "ENV: DATABASE_URL=${DATABASE_URL:-not-set}"
echo "ENV: REDIS_URL=${REDIS_URL:-not-set}"

echo "Running migrations (no-op if not configured)"
# If you have migrations, run them here (commented out by default)
# alembic upgrade head || true

echo "Starting uvicorn"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
