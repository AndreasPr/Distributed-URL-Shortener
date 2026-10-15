# ADR 0004: Correct baseline failures without redesign

Status: Accepted

## Context

The baseline identifies Redis reads aborting redirects, misleading HTTP statuses,
full destination URLs in custom spans, and a rate limiter absent from the real
application. Unit tests did not exercise the assembled application.

## Decision

- Catch only Redis connection/timeout exceptions in a shared read helper, log
  them, increment the unlabelled `cache_errors_total`, and return None.
  A failed cache lookup also counts as a miss because it requires DB fallback.
  Health checks use the same helper; unexpected cache programming errors propagate.
- Check URL existence before returning analytics. Preserve successful response
  bodies and use 503 for service failures; readiness identifies failing DB/Redis
  dependencies with its existing body and uses 503. A health-specific session
  dependency reports acquisition failures and closes acquired sessions.
- Add dependency-free `/livez` before the catch-all redirect route.
- Record destination scheme, hostname, and short code instead of full URL
  attributes. Redact Redis command arguments and Requests HTTP URL attributes
  with instrumentation hooks, retaining safe origin attributes for HTTP.
  These hooks cover the application's individual Redis commands; Redis pipelines
  are not used by the backend and would need separate instrumentation review.
- Explicitly convert validated HttpUrl to str at the route boundary. Keep
  base62(0) == "" documented and tested; generated database IDs start at 1.
- Test the real FastAPI application using SQLite and fake Redis/Kafka, with
  observability startup exporters stubbed. Keep missing limiter registration as
  a strict xfail pointing to step 2.1.

## Consequences

See [API changes](../api-changes.md) for every status change and route reservation.
No rate-limiter, Kafka delivery, worker, or abuse-pipeline redesign is included.
Analytics adds one URL lookup. Cache outages can increase database load.
The live-service stack is not validated by the mocked assembled-app tests.

Additional validation found the installed OTel 0.41b0 instrumentation imports
`pkg_resources`, absent from this environment. Runtime initialization therefore
falls back to its existing no-tracing behavior. Two actual instrumentation tests
are explicitly skipped when that import is unavailable; in-memory span privacy
and hook-wiring tests still run. Dependency compatibility repair is deferred,
rather than silently changing the dependency locks in this correctness step.
Tracing exceptions/events and future instrumentation need separate privacy
review; the tests here assert span attributes for the current URL operations.
