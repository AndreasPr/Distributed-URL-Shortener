# Step 0.4 API changes

Successful response shapes are unchanged. Error responses use FastAPI's existing
`{"detail": "..."}` convention. The readiness body retains
`status`, `db`, `redis`, and `total_urls`.

| Request / condition | Previous status | New status |
| --- | --- | --- |
| `GET /urls`: service/query exception | 200 with an empty list | 503 with a generic error detail; exception logged |
| `GET /analytics/{code}`: code absent from the URL table | 200 with zero clicks | 404 |
| `GET /analytics/{code}`: service/query exception | 404 | 503 with a generic error detail; exception logged |
| `GET /health`: DB query or Redis unavailable (including false ping) | 200 with degraded body | 503 with the same body keys naming the failed dependency |
| `GET /health`: DB session acquisition fails | 500 | 503 with `db: unreachable` |
| `GET /{code}`: Redis connection/timeout failure, database contains code | 500 | 307 redirect from the database result |
| `GET /{code}`: Redis connection/timeout failure, database has no code | 500 | 404 |
| `GET /livez` | Previously handled as short code `livez` (normally 404; potentially 307 if present) | 200 with `{"status":"ok"}`, without dependency access |

An existing URL with no clicks still returns 200 and zero clicks from analytics.
Healthy readiness remains 200. `/health/redis` retains its existing status behavior:
connection/timeout errors return 503, while a false ping without an exception
retains its existing 200 error body. Its reads now log/count connectivity errors.
Dependency acquisition failures on other DB-backed routes still return 500.
Redirect fallback still requires a functioning database.

`livez` is now a reserved route, like existing `health` and `metrics` routes.
The base62 allocator's possible collision with reserved route names is not
redesigned in this step.

No rate limiter was registered: the assembled-app assertion is a strict expected
failure referencing step 2.1. Rate limiting, event delivery, and the abuse
pipeline are deferred.

# Step 1.3: URL features

- POST /shorten still returns 200 with only `short_code`. Optional `custom_alias`
  accepts 3–32 ASCII letters/digits/hyphen/underscore; optional `expires_at` accepts
  a future ISO timestamp with timezone. Duplicate aliases return 409, including
  aliases belonging to deleted/expired links. Reserved aliases return 422.
- URL validation now returns 422 for credentials, missing hosts, URLs longer than
  2048 characters, non-HTTP(S) schemes, localhost/local names, and private,
  loopback, link-local or other non-public IP literals, including IPv6. Hostnames
  are lowercased/IDNA-normalized and trailing dots removed. DNS is not resolved.
- GET /{code}: active remains 307; expired changes from 307 to 410; deleted
  changes from 307 to 404. Missing remains 404. Deletion takes precedence over
  expiry. Even cache hits require a healthy primary DB; DB failures can now
  return 500 where an old cache-only redirect could have returned 307.
- New DELETE /urls/{code}: 204 (empty body), or 404 for missing/already deleted.
  It commits deleted_at and attempts Redis eviction. No authentication/ownership
  protection is added in this step.
- GET /urls remains 200 with the same item fields; deleted entries are excluded.
  Expired entries and existing analytics remain available.
- OpenAPI now correctly documents successful redirects as 307 rather than the
  previous generated 200 declaration. This documentation correction does not
  change the successful redirect status itself.

Upgrade to Alembic 0003 before starting the updated application. Alias uniqueness
is case-sensitive; reserved names are rejected case-insensitively. API and cache
behavior is tested in [test_url_features.py](../tests/test_url_features.py).

# Step 1.4: Cache hardening

Response shapes and successful/error status contracts are unchanged. An open
Redis circuit now reports the existing /health 503 degraded body with Redis
unreachable, without waiting on another Redis socket operation. Known active
links still redirect (307), unknown links return 404, and expired links return
410 when PostgreSQL is healthy and Redis is unavailable. Unknown codes are
cached for 30 seconds; creations invalidate that entry and its in-flight loader.
A failed invalidation during a partial Redis outage can briefly leave a stale
404 on another replica (bounded by the negative TTL). Positive redirects still
validate deletion/expiry in PostgreSQL. See [ADR](adr/0002-cache-strategy.md).
