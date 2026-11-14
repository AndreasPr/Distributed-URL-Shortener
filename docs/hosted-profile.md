# One-container hosted profile

This is an opt-in backend profile, not a replacement for Compose or kind.
`APP_ROLE=api` is the default and starts no consumers. Existing dedicated worker
commands and migration Jobs still work unchanged. `APP_ROLE=all` runs the API,
analytics consumer and abuse consumer in one Python process. `APP_ROLE=worker`
starts both consumers and only serves health/metrics routes; use the same launcher.
Do not combine `all` with extra Uvicorn workers or the dedicated worker containers.

## Startup and shutdown

Run `python -m app.hosted` (Render's Docker command override). It binds `PORT`
(default 8000), disables Uvicorn's implicit proxy trust, and limits request-draining
on shutdown to one second. FastAPI lifespan replaces the deprecated event hooks.
Startup logs its lifespan duration; migrations and consumer construction run in a
background daemon thread so `/livez` does not wait for PostgreSQL, Redis or an LLM.
The automated test requires liveness within one second of lifespan startup; this
is **not** a promise of a subsecond Render cold boot, image pull or Python import.

The hosted startup retries migrations with capped exponential backoff. One
PostgreSQL transaction holds `pg_advisory_xact_lock(831517423)` while Alembic runs
on that same connection. Lock acquisition times out after two seconds and retries;
DDL has a 60-second statement timeout. The lock releases on commit, rollback or
connection loss. Requests other than health/metrics return 503 until migrations
succeed. Do not run an additional pre-deploy migration command for this profile.

Each consumer owns a separate SQLAlchemy session and event-bus client. A supervisor
reconstructs a crashed/exited consumer after 0.5 seconds, doubling up to 30 seconds;
a minute of stable runtime resets the backoff. Internal transient worker failures
retain their existing retry/unacknowledged-message behavior. Worker failure does
not gate redirects once migration completes. `/health` returns 503 with worker
liveness, recent-loop health and lag while a worker is unhealthy. Unknown/stale lag
is `null`, never a misleading zero. Prometheus exposes `hosted_worker_alive`,
`hosted_worker_healthy`, `hosted_worker_lag`, `hosted_worker_restarts_total` and
`hosted_shutdown_timeouts_total`.

SIGTERM sets both stop events and shares a seven-second join budget; analytics
attempts its final commit/ack. Publisher shutdown gets one second and tracing half
a second, plus the launcher's one-second HTTP drain. Normal cooperative shutdown
flushes and closes resources. Python cannot kill a stuck thread safely: the daemon
fallback lets the process exit within this budget, records a shutdown timeout, and
leaves unacknowledged durable events for recovery. It does **not** guarantee every
in-memory click survives termination. An in-flight database commit remains safe
through event-ID deduplication when redelivered.

## Settings and deployment

The blueprint is one free web service in **Virginia**, selected for the project's
Supabase `us-east-1` region. No databases or paid resources are provisioned.
It uses `autoDeployTrigger: "off"`; the opt-in CI-gated deployment hook in
[the hosting runbook](hosting-runbook.md) replaces automatic deployment. Keep CI
checks required and protect the default branch. See the official
[Blueprint reference](https://render.com/docs/blueprint-spec),
[CI deploy semantics](https://render.com/docs/deploys), and
[regions](https://render.com/docs/regions).

Set these values privately in Render; nothing real belongs in Git:

| Setting | Hosted value |
| --- | --- |
| `APP_ROLE` | `all` |
| `ENVIRONMENT`, `AUTH_MODE` | `production`, `supabase` |
| `DATABASE_URL` | PostgreSQL transaction-pooler URI with `sslmode=require`; backend/migration owner role, never anon/authenticated |
| `REDIS_URL` | Blueprint private Key Value connectionString (external alternatives require `rediss://`); Streams, consumer groups and XAUTOCLAIM required |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Existing Auth project settings |
| `CORS_ORIGINS` | Explicit exact frontend origins; no wildcard or localhost |
| `CLIENT_IP_MODE` | Blueprint explicitly sets `peer_only`; no visitor-IP attribution |
| `TRUSTED_PROXIES` | Unset in peer-only; required restricted CIDRs in production trusted_proxies mode; `/0` always refused |
| `EVENT_BUS` | Defaults to `redis_streams` only in `all` |
| `LLM_PROVIDER`, `LLM_DAILY_BUDGET` | Blueprint uses `fake`, `0`: no live inference; gray-zone budget failure stays suspicious |
| `OTEL_SDK_DISABLED` | Blueprint uses `true`; enable only with an explicitly configured reachable collector |

The Blueprint opts into peer-only mode rather than guessing proxy CIDRs. Anonymous
IP buckets are not enforced, avoiding shared lockouts; Turnstile and authenticated
principal quotas remain. Uvicorn keeps proxy-header rewriting disabled. See the
[hosting runbook](hosting-runbook.md) for setup and residual limitations.

The hosted pool has five connections and at most two overflow connections,
pre-ping and 300-second recycling. Migration uses one temporary separate connection.
`SET LOCAL` statement/lock timeouts execute per transaction; no session settings,
prepared statement cache or session advisory lock is used. psycopg2 supports the
URL's TLS parameters. Existing local/kind pool behavior is preserved.

Production refuses missing/unsafe CORS, unrestricted/absent trusted proxy settings,
known default connection passwords, and fake LLM with an unspecified daily budget.
The existing Supabase-only production guard still applies. The Docker CMD preserves its API default and dispatches explicit all/worker roles
to the hosted launcher. Compose/kind manifests are unchanged; the blueprint also
sets the hosted command explicitly.

## Verification and claims

Run `make check`, then the disposable PostgreSQL checks with
`RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest tests/test_hosted_profile.py -m docker`.
Tests use mocks or disposable local containers, never hosted credentials.
The backend profile is implemented and locally tested as recorded in
[hosted-verification.md](hosted-verification.md). No Render deployment, real provider
TLS connection, platform proxy correctness or hosted availability is claimed.
See [hosted-limits.md](hosted-limits.md) before deciding to deploy.

## Deployment pipeline update (15.6)

Render auto-deploy is now off in the blueprint. The opt-in GitHub production workflow invokes a secret deploy hook only after successful default-branch CI and verifies the deployed revision. See [hosting runbook](hosting-runbook.md) for exact setup, private Render Key Value Free and its restart-loss limitation, secret rotation and manual rollback. Earlier checksPass-only setup is superseded by this hook gate.


### Private Key Value baseline (step 15.6a)

The blueprint also provisions one Free Key Value instance in Virginia, in the API's
workspace, with no external IP access. REDIS_URL is injected by service reference.
External Redis still requires TLS; the narrowly permitted private hostname format
and the loss of Streams/counters on restart are documented in the
[hosting runbook](hosting-runbook.md#3-render-key-value-private-free-ephemeral).
Local Compose and kind retain their existing Redis configuration.
