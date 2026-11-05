# Database migrations

Alembic owns schema changes. Install the hashed requirements as described in
[developer.md](developer.md). Revision 0001 reproduces the archived
[scripts/migrate.sql](../scripts/migrate.sql), including PostgreSQL SERIAL primary
keys, nullable timestamps/default NOW(), nullable unique URL short codes,
non-null analytics short codes, cascading foreign key, and the descending
(short_code, clicked_at) index. The old Python runner is removed; the SQL file
is only historical documentation and a migration-test fixture.

Revision 0002 adds nullable urls.expires_at, urls.deleted_at (timestamps without
time zone), urls.created_by (unbounded varchar), and analytics.event_id
(unbounded varchar). A partial unique index enforces uniqueness for non-null
event IDs; multiple nulls remain valid. Existing URL uniqueness already has a
PostgreSQL backing index, and the analytics composite index already exists, so
0002 does not add redundant indexes. No expiration, deletion, ownership, or
event deduplication application behavior is enabled yet.

## Fresh database / routine upgrades

Export DATABASE_URL or DB_URL before running the host CLI; DATABASE_URL takes
precedence, exactly as in app/core/config.py. The application/Alembic does not
load .env automatically. Follow the trusted-local-env instructions in
[DEPLOYMENT.md](DEPLOYMENT.md); do not paste connection URLs into logs.
Alembic uses settings.DB_URL directly, including percent-escaped credentials,
without interpolating it through alembic.ini.

From the repository root:

```sh
.venv/bin/alembic current
.venv/bin/alembic upgrade head
.venv/bin/alembic check
```

Compose's dedicated migrate service runs `alembic upgrade head`; API and worker
wait for successful completion. `docker compose --profile kafka up --build -d` builds the new
image. The standalone Docker image default command upgrades then execs uvicorn,
and does not start the API if migration fails. Overriding its command bypasses
that default; run migrations explicitly when starting a worker.

Kubernetes uses `k8s/base/4-db-migrate-job.yaml`. Wait for this Job to complete before
rolling out API/worker. API replicas override the image command to serve only;
they do not race migrations. After an earlier Job has finished, delete that
completed Job and recreate it with the new image for the next migration; do not
reuse a completed Job as proof that new revisions ran. Never delete a running
migration Job. `deploy.sh` now stops on migration wait failures. No Kubernetes
deployment was performed in this step.

## One-time adoption of an existing pre-Alembic database

Do not run revision 0001 against populated tables, and do not stamp head.
Stop application/worker writes, take a backup outside Git, and verify the
actual schema against the archived SQL / revision 0001 first. Check both tables'
columns, types, nullability, defaults, primary keys, the unique short_code
constraint, cascading foreign key, and descending composite index. PostgreSQL
psql's `\d+ urls` and `\d+ analytics` show these definitions.

Older databases created with ORM create_all may differ (nullable analytics
short_code, missing FK, extra single-column indexes). Reconcile those explicitly
after checking the data, rather than claiming they match by stamping them.
Do not stamp revision 0001 if the schema differs.

For a verified legacy SQL schema, with the new image built:

```sh
docker compose build migrate
docker compose run --rm migrate alembic stamp 0001
docker compose run --rm migrate alembic upgrade head
docker compose run --rm migrate alembic check
docker compose --profile kafka up --build -d
```

For host execution, use `.venv/bin/alembic stamp 0001`, then `upgrade head` and
`check`. Stamping records a version only; it does not inspect or modify tables.
The disposable PostgreSQL legacy-upgrade test verifies this path preserves rows.
No existing local database or persistent volume was modified during development.

## Future revisions and rollback

```sh
.venv/bin/alembic revision --autogenerate -m "describe schema change"
# Review the generated upgrade AND downgrade before applying.
.venv/bin/alembic upgrade head
.venv/bin/alembic check
```

Run one migration process per database, before starting code that needs the new
columns. Alembic version tracking does not serialize concurrent migration runners.
DDL can take table locks; plan migrations accordingly.

`alembic downgrade 0001` removes the four new columns and event-ID index, losing
any values stored in them. `downgrade base` drops both tables. Use downgrades only
on disposable databases or with a reviewed recovery/backup plan.

## Tests

```sh
make check
RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest tests/test_migrations.py -v
```

The default suite tests upgrade/schema comparison on empty SQLite (test-only,
not a supported runtime DB) and PostgreSQL offline SQL generation. Two tests
marked `docker` require explicit opt-in; they create disposable postgres:16.13-alpine
containers on loopback ephemeral ports, with trust authentication and no volumes,
then remove them. They never use settings.DB_URL or your Compose database.
With opt-in enabled, unavailable Docker causes failure rather than a silent skip.

The PostgreSQL tests verify empty upgrade, no model/schema autogenerate diff,
non-null/FK/uniqueness/cascade behavior, descending index order, partial uniqueness,
null event IDs, repeated upgrade, data preservation, downgrade/re-upgrade, and
legacy SQL adoption. These tests move into Testcontainers in step 5.1.

Alembic 1.18.4 is pinned for this step, not claimed to be the newest release.
References: [release](https://pypi.org/project/alembic/1.18.4/),
[configuration / injected test connections](https://alembic.sqlalchemy.org/en/latest/api/config.html).

## Step 1.3: 32-character aliases (revision 0003)

The current head is 0003. It widens short_code from VARCHAR(10) to VARCHAR(32)
in both urls and analytics, preserving their foreign key and indexes. For an
already Alembic-managed database, run `alembic upgrade head` before deploying
Step 1.3; do not stamp again. Existing pre-Alembic databases still follow the
verified 0001 adoption procedure above. The migration can lock both tables.

Downgrading to 0002 refuses if either table contains a code longer than 10
characters, including soft-deleted links. No automatic truncation or deletion
is performed. PostgreSQL tests verify 32-character alias creation and analytics
references after migration, and refusal of an unsafe downgrade.

## 0006: workspaces and Supabase-ready identities

`alembic upgrade head` now includes UUID users/workspaces, memberships, pending
invites, and workspace/human-creator attribution on URLs, API keys, analytics,
verdicts and abuse outbox rows. Existing records and secrets remain in the `legacy`
workspace. Short codes remain globally unique. Users are not fabricated during
backfill: their UUID will be a verified Supabase subject in step 15.3.

The migration enables RLS without policies on all PostgreSQL tables. The current
owner-role server still works; an unprivileged role is default-denied until policies
exist. See [security](security.md) for the precise boundary. Do not apply this to
an API using a non-owner role and expect it to continue reading rows.

Before deploying new routes, inspect existing aliases named `me`, `workspaces`, or
`api-keys`; those names become reserved. A pre-existing alias at one of those exact
paths conflicts with the new API route and needs an explicit operator migration
plan; do not silently change its destination or assume the redirect survives.

`alembic downgrade 0005` preserves pre-existing business rows but **discards user,
workspace, membership and invite records plus tenant attribution**, and disables
RLS on surviving tables. Do not downgrade a live multi-workspace system without a
backup and an explicit data recovery plan. No cloud credentials are required to
validate migrations against the disposable local PostgreSQL fixture.

## Auth alignment revisions

`0007` adds nullable `users.email_verification_checked_at` for the shared hourly
Supabase metadata-attempt budget. `0008` hardens application ACLs only when `anon`
or `authenticated` exists; on ordinary PostgreSQL it changes no ACLs. Existing
RLS remains enabled. PUBLIC-inherited privileges and migration-creator global/schema
default grants are removed too, since PostgreSQL cannot deny a role a PUBLIC grant.
Application-owned sequences and non-extension routines in the application schema
are covered; additional creator roles/inherited role grants need operator review.

Run `alembic upgrade head` before the new API. Production auth configuration is now
mandatory; see [auth](auth.md). Downgrading `0008` deliberately does not regrant
privileges. Dropping `0007` loses the email-check timestamp, so a later upgrade
permits an immediate refresh. Real PostgreSQL tests are in
`tests/integration/test_auth_role_privileges.py` and the migration suite.
