# API keys and rate limits

The API is a shared workspace, not a multi-tenant service. API keys authorize
operations; they do not currently restrict access to the URLs created by that key.
Each new URL records its creator's key ID as a string in `urls.created_by`. Legacy
URLs retain NULL ownership. Read keys can view all active URLs and their analytics;
write keys can create and soft-delete any URL. Admin implies both read and write.

## Provisioning and revocation

Run migration `0004` (`alembic upgrade head`) before starting the new API. Compose
runs it through the migration service. Key management is a local operator CLI,
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
creates an administrative key. Default scopes are read and write. Revoke by ID,
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
on mutations. Key creation is CLI-only; there is no HTTP key-creation endpoint.
Successful existing API response shapes remain unchanged.

Listing URLs and viewing click analytics were previously public. They now require
read access because destinations and usage data should not be disclosed to every
anonymous caller. This also means old scripts must supply a read/write key. The
current k6 scripts predate authentication and need header/expectation updates before
reuse; their historical spoofed-IP approach no longer creates separate buckets.
MCP uses direct database access rather than these HTTP routes; its legacy
sliding-window signal reader is not token-bucket history and must not be treated as
an accurate rate-limit abuse signal. Redesign of that pipeline remains deferred.

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
