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
