# API keys and rate limits

The API now isolates tenant data by workspace. API keys bind to one workspace;
clients cannot select a different workspace by sending an ID in a header or body.
Migration `0006` backfills all existing URLs, keys, analytics, verdicts and outbox
records into the `legacy` workspace (`00000000-0000-0000-0000-000000000001`).
Existing key secrets and globally unique short codes remain valid. Historical
`created_by_user_id` stays NULL: a key ID is not evidence of a human identity.

## Principals and permissions

`app/api/principal.py` defines one immutable Principal and a permission table.
`app/api/auth.py:require_permission` is the shared dependency for permission checks
and write rate limiting. API-key authentication currently sets `api_key_id`, not
`user_id`: read maps to viewer, write to member, admin to admin. Permissions also
require the corresponding key scope; a write-only key does not gain read access.

| Role | Permissions (cumulative) |
| --- | --- |
| viewer | Read links, lifecycle/status previews, analytics and workspace metadata |
| member | Create links; modify/delete own links only |
| admin | Manage all links and keys in the workspace, abuse review and activity |
| owner | Manage members, create workspaces; billing and workspace deletion are reserved permissions, not implemented endpoints |

Keys cannot become owner or platform administrator by requesting scopes. New
self-service `GET/POST /api-keys` and `DELETE /api-keys/{id}` require workspace
key-management permission (admin/owner); legacy `/admin/keys` aliases remain.
POST accepts `name` and `scopes` and returns the secret once. Listings exclude it
and its hash. A key from workspace A cannot list or revoke a key from B.

Cross-workspace resource reads and authorized mutations return **404**, as do
member attempts to delete another member's links. A role/scope that cannot perform
the operation at all returns **403**, independent of whether the resource exists.
Global key-hash lookup is the authentication bootstrap, not a tenant listing.
Public redirects resolve globally unique codes; health retains a global aggregate
URL count. Neither is a private listing. Worker event persistence derives workspace
from the stored URL, never a tenant ID supplied in event JSON. Tenant repositories
require explicit workspace arguments; the two named public redirect lookups and
trusted click-ingestion entry point are deliberate exceptions tested separately.

## Supabase identity boundary

`users.id` equals the verified Supabase JWT `sub` UUID. There are no password
columns. The API verifies signatures and claims before resolving database
memberships; token role claims and user metadata never grant permissions.
First login provisions a personal workspace atomically. Suspended/deleted users
are rejected. See [authentication](auth.md) for modes, key rotation and local demo
login. `platform_admin` remains false; review endpoints are workspace-only.

`GET /me` exposes safe principal metadata. `GET /workspaces` currently lists only
the selected workspace (the API key's workspace or bearer membership context).
`X-Workspace-ID` can select another existing bearer membership; it cannot grant one.
Owner mutations now accept verified user tokens. API keys still cannot acquire
owner permissions. Invitations remain pending rows, with no email sending or
acceptance endpoint. A workspace row lock serializes owner changes; removing or
demoting the final owner returns **409**.

## PostgreSQL RLS deployment boundary

Migration `0006` enables RLS with **zero policies on every application table and
alembic_version**. This is preparation, not a claim that the current server is
isolated by RLS: PostgreSQL table owners/superusers bypass non-forced RLS. The
current migration/API deployment uses such a trusted database role and enforces
workspace isolation in application queries. A non-owner role without BYPASSRLS
sees no rows and cannot insert until policies are supplied. Real PostgreSQL tests
prove this default-deny behavior. Do not switch the running API to an unprivileged
role before 15.3 supplies the verified context, policies and role tests. No policy
or FORCE ROW LEVEL SECURITY is silently installed here.

Upgrade before starting the new application. Downgrading to `0005` retains link,
key, analytics and verdict data but drops identity/workspace/member/invite records
and tenant attribution; it disables RLS on surviving tables and must not be used
as a routine rollback once multiple tenants exist. Back up first. Plan limits are
step 15.2; the `plan='free'` column does not enforce quotas.

## Provisioning and revocation

Run migration `0006` (`alembic upgrade head`) before starting the new API. Compose
runs it through the migration service. Key management includes a local operator CLI,
trusted because it has direct database access; it does not require an API key to
bootstrap. Never expose shell/database access to untrusted clients.

For Redis Streams (use `api` and profile `kafka` in Kafka mode):

```sh
docker compose --profile redis-streams up --build -d
docker compose --profile redis-streams exec api-redis \
  python -m app.cli keys create --name browser --scopes read write
docker compose --profile redis-streams exec api-redis \
  python -m app.cli keys list
docker compose --profile redis-streams exec api-redis \
  python -m app.cli keys revoke 1
```

Creation prints JSON containing the full key **once**, after committing its record.
Save it privately or paste it directly into the frontend's API-key field/Swagger
Authorize dialog. It cannot be recovered later: replace a lost key by creating a
new key and revoking the old one. `keys create --name operator --scopes admin`
creates an administrative key. Add `--workspace <uuid>` to create/list/revoke
commands for a non-legacy workspace; omission deliberately targets legacy. Default scopes are read and write. Revoke by ID,
not the display prefix. Revocation is idempotent; unknown IDs are reported as errors.
Do not commit keys, put them in URLs, or paste creation output into issue reports.

For host-run commands, export the existing DB_URL/DATABASE_URL settings and use
`.venv/bin/python -m app.cli keys ...`. Normal API startup on the host must include
`--no-proxy-headers` (see proxy trust below).

Keys contain 32 cryptographically random bytes encoded with URL-safe base64.
Only SHA-256 digests are stored in `api_keys.key_hash`, under a unique constraint.
Passwords would need a password KDF; these high-entropy generated keys are not
human passwords. The first eight characters are stored solely as a display prefix.
The digest is compared with `hmac.compare_digest`, including a dummy fixed-length
digest comparison for unknown keys. Database lookups and overall request timing
are not constant time. Metadata listings never return hashes or full keys.
Successful key authentication updates `last_used_at` in UTC. No authentication
cache is used, so subsequent requests observe revocation; already-authorized
in-flight requests may complete. A database outage produces 503, not an auth bypass.

## HTTP access

Send `X-API-Key: <your key>` on protected calls. Swagger exposes the header through
its APIKey security scheme. Use HTTPS outside local development.

| Endpoint | Required access |
| --- | --- |
| `POST /shorten` | write (or admin) |
| `DELETE /urls/{code}` | write (or admin) |
| `GET /urls` | read (or admin) |
| `GET /analytics/{short_code}` | read (or admin) |
| `GET /admin/keys` | admin; returns metadata only |
| `DELETE /admin/keys/{key_id}` | admin; revokes, returns 204 or 404 |
| `GET /{code}` | Public redirect |
| `/health`, `/health/redis`, `/livez` | Public operational status |
| `/metrics` | No key; local API port, internal-only port in Kubernetes |
| `/docs`, `/openapi.json` | Public documentation |

Missing, unknown, or revoked keys return **401** with a generic error and
`WWW-Authenticate: APIKey`. Valid keys lacking the required scope return **403**.
Write does not implicitly include read. Admin includes both and is also rate-limited
on mutations. HTTP key creation is available through `POST /api-keys` for workspace admins.
Successful existing API response shapes remain unchanged.

Listing URLs and viewing click analytics were previously public. They now require
read access because destinations and usage data should not be disclosed to every
anonymous caller. This also means old scripts must supply a read/write key. The
k6 scripts supply keys, and the MCP server calls authenticated HTTP endpoints using
its configured key; both inherit that key's workspace boundary.

## Token buckets

The formerly unregistered sliding-window code is replaced and the limiter is
explicitly registered in `app/main.py`. Public redirect limiting runs in middleware.
Write limiting runs in the shared scope dependency after authentication, when the
matched route is available; middleware adds resulting headers to the response.
CORS wraps the limiter so browser clients can read errors and headers. Preflight,
health, liveness, metrics and read/admin-list endpoints do not consume tokens.

One atomic Redis Lua invocation reads server TIME, refills tokens, consumes one
when available, and persists the remaining balance with an expiry. This shares
limits across API replicas, avoids per-process clock differences, and allows idle
buckets to expire after a full-refill interval. No separate read/write race exists.

| Setting | Default | Meaning |
| --- | --- | --- |
| `WRITE_RATE_CAPACITY` | 20 | Initial/full write burst per key and route template |
| `WRITE_RATE_REFILL` | 1 | Write tokens restored per second |
| `REDIRECT_RATE_CAPACITY` | 120 | Initial/full redirect burst per client IP |
| `REDIRECT_RATE_REFILL` | 10 | Redirect tokens restored per second |
| `TRUSTED_PROXIES` | empty | Exact IPs/CIDRs allowed to supply forwarding chains |

Bucket identities combine the matched template with a hashed key-ID/IP identity;
raw secrets are never stored in Redis. Every short code shares `/{code}` for a
client IP. Deletes share `/urls/{code}` per key; changing the code does not bypass
the bucket. POST and DELETE have separate template buckets. Clients behind one
untrusted proxy/NAT share the socket-IP redirect bucket unless trust is configured.

Successful limited responses and 429 responses carry `RateLimit-Limit`,
`RateLimit-Remaining` and `RateLimit-Reset` (whole seconds until full refill).
429 additionally includes `Retry-After` (at least one second until a token returns)
and `{"detail":"Rate limit exceeded"}`. These are the widely used unprefixed
rate-limit fields; Reset is a relative duration, not a UNIX timestamp.

Redis connection/timeout failures, an open cache circuit, and invalid limiter
responses **fail closed for writes with 503 and Retry-After: 1**. They are not
reported as a quota-exhaustion 429. Public redirects **fail open** and fall back to
PostgreSQL as before. This preserves redirect availability without allowing
unbounded mutations when the limiter cannot enforce a budget. The cache client's
short timeouts and circuit breaker also cover limiter calls. Auth failures are
returned before write quota consumption. Malformed authenticated write requests
may consume a token.

## Proxy trust

The immediate socket peer must belong to `TRUSTED_PROXIES` before X-Forwarded-For
is considered. The chain is walked right-to-left, removing only trusted hops and
stopping at the first untrusted address; attacker-supplied leftmost entries are
ignored. Invalid chains fall back to the socket address. IPv4 and IPv6 CIDRs work.
Use specific addresses/ranges for your ingress; do not trust all client addresses.

Uvicorn can rewrite the peer before application middleware runs. Docker, Compose
and Kubernetes commands therefore explicitly use `--no-proxy-headers`; use the
same flag for host runs. Otherwise the application cannot reliably recover the
original socket peer. Forwarding headers do not control the key identity for writes.

## Kubernetes metrics boundary

Kubernetes sets `METRICS_PORT=8002`: API-port `/metrics` returns 404 and Prometheus
serves the registry on a separate listener. `api-metrics` is a ClusterIP service;
public API ingress exposes only port 8000. NetworkPolicy allows port 8002 only from
Prometheus-labelled pods in the same namespace. The public Prometheus ingress rule
is removed as well. Use authorized `kubectl port-forward` for operator access.

The CNI must enforce NetworkPolicy. Namespace/pod-label management and port-forward
permissions remain administrator trust boundaries. The policy does not provide
HTTP authentication and does not claim isolation from cluster administrators.
Local Compose keeps unauthenticated `/metrics` on port 8000 for development.
`METRICS_PORT=0` is the default; do not expose local metrics publicly.

## Frontend and checks

The Next.js key settings field keeps the key only in JavaScript memory for the
current tab, clears it on reload, and has an explicit Forget button. Applying a
key remounts the page content so protected reads retry. No localStorage, cookie,
server-side key file, or `NEXT_PUBLIC_API_KEY` bundle secret is introduced. Browser
code and devtools can still access a key in memory; use only appropriately scoped
keys on a trusted frontend. Health calls omit the header; shortening, deletion,
URL listing and analytics calls include it.

Tests: `tests/test_auth.py`, `tests/test_rate_limiter.py`, the assembled-app test
(now without xfail), migration/schema tests, Kubernetes configuration checks, and
`frontend/tests/api.test.cjs`. Run `make check`, `make frontend-check` and
`make mcp-test`. Real Redis Lua integration tests are deferred to the Testcontainers
suite in step 5.1; the fake validates bucket behavior, not the Redis interpreter.
See [verification](auth-verification.md) for exact results and limits.

Step 2.2 adds bounded request bodies, exact-origin CORS, sanitized error
responses, outbound deadlines and container/network isolation. See the
[threat model](threat-model.md) for implemented controls and residual risks,
and the [verification and rollout checklist](security-hardening-verification.md)
before updating an existing deployment.


## Abuse review

GET /admin/flagged and POST /admin/flagged/{code}/review require admin scope.
Reviews record API-key ID and timestamp; write rate limits apply. Malicious or
manually blocked links return 451 even on cache hits. Suspicious and pending
links remain redirectable. The async classifier is not proof of safety; see
[the pipeline's boundaries and residual risks](abuse-pipeline.md).

## User tokens

[Authentication modes and verification](auth.md) document Supabase bearer tokens,
local-only demo identities, membership-based authority, and JWKS rotation limits.
API-key authentication remains the default. Do not expose local demo login to a
shared/public network; it deliberately permits passwordless demo-owner access.
