#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Disposable local-only fixture; no .env files, hosted DSNs or real identities.
drill_name="relaymark-backup-drill-$$"
drill_build=$(mktemp -d)
cleanup() {
  docker rm -f "$drill_name" >/dev/null 2>&1 || :
  rm -rf "$drill_build"
}
trap cleanup EXIT
cat > "$drill_build/Dockerfile" <<'EOF'
FROM postgres:16.13-alpine
RUN apk add --no-cache age python3
EOF
docker build -q -t relaymark-backup-drill:local "$drill_build" >/dev/null
docker run -d --name "$drill_name" -e POSTGRES_HOST_AUTH_METHOD=trust \
  -p 127.0.0.1::5432 -v "$PWD/scripts:/work:ro" relaymark-backup-drill:local >/dev/null
for _attempt in $(seq 1 60); do
  if docker exec "$drill_name" pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$drill_name" pg_isready -U postgres >/dev/null
drill_port=$(docker port "$drill_name" 5432/tcp | awk -F: '{print $NF}')
DATABASE_URL="postgresql://postgres@127.0.0.1:$drill_port/postgres" \
ENVIRONMENT=development AUTH_MODE=apikey_only APP_ROLE=api \
.venv/bin/python - <<'PY'
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from uuid import uuid4
import os
command.upgrade(Config('alembic.ini'), 'head')
from app.models.identity import User, WorkspaceMember, DEFAULT_WORKSPACE_ID
from app.models.url import URL
from app.models.analytics import Analytics
engine = create_engine(os.environ['DATABASE_URL'])
with Session(engine) as db:
    user_id = str(uuid4())
    db.add(User(id=user_id, email='backup-fixture@example.test', email_verified=True))
    db.flush()
    db.add(WorkspaceMember(workspace_id=DEFAULT_WORKSPACE_ID, user_id=user_id, role='owner'))
    db.add(URL(short_code='backup-drill', long_url='https://example.com/', workspace_id=DEFAULT_WORKSPACE_ID, created_by_user_id=user_id))
    db.flush()
    db.add(Analytics(short_code='backup-drill', event_id='backup-fixture-event', workspace_id=DEFAULT_WORKSPACE_ID))
    db.commit()
engine.dispose()
print('PASS: Alembic head and synthetic tenant/link/click fixture created')
PY
docker exec "$drill_name" sh -c 'umask 077; mkdir /tmp/drill; age-keygen -o /tmp/drill/identity.txt 2>/dev/null; age-keygen -y /tmp/drill/identity.txt > /tmp/drill/recipients.txt'
docker exec -e BACKUP_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/postgres "$drill_name" \
  python3 /work/backup.py create --local --recipients /tmp/drill/recipients.txt --file /tmp/drill/fixture.dump.age
docker exec "$drill_name" createdb -U postgres restored
docker exec -e RESTORE_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/restored "$drill_name" \
  sh -c 'python3 /work/backup.py restore --identity /tmp/drill/identity.txt --file /tmp/drill/fixture.dump.age'
drill_counts=$(docker exec "$drill_name" psql -U postgres -d restored -At -c \
  "SELECT (SELECT count(*) FROM users), (SELECT count(*) FROM urls), (SELECT count(*) FROM analytics), (SELECT count(*) FROM workspace_members), (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity);")
[[ "$drill_counts" == '1|1|1|1|0' ]]
echo 'PASS: restored users=1 links=1 clicks=1 memberships=1; all public tables retain RLS'
if docker exec -e RESTORE_DATABASE_URL=postgresql://postgres@127.0.0.1:5432/restored "$drill_name" \
  python3 /work/backup.py restore --identity /tmp/drill/identity.txt --file /tmp/drill/fixture.dump.age; then
  echo 'FAIL: nonempty restore target accepted' >&2
  exit 1
fi
echo 'PASS: nonempty target refused; disposable container, keys and dumps removed on exit'
