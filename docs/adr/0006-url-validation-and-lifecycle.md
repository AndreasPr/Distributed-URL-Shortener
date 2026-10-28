# ADR 0006: URL validation, aliases, and lifecycle correctness

Status: Accepted (step 1.3)

## Decision

Validate POST /shorten at the Pydantic boundary. Accept HTTP(S) URLs up to 2048
characters, require a raw hostname before parser normalization, reject credentials,
whitespace/control characters/backslashes, localhost and its subdomains, .local,
and non-public IP literals (including IPv4-mapped IPv6 and multicast). Normalize
host casing, IDNA, IP representations, and trailing DNS dots through HttpUrl and
explicit host validation. Preserve destination path/query/fragment semantics.

This is syntactic validation of names and addresses, not DNS-based destination
verification. The service does not fetch the destination. A public-looking domain
may resolve to a private address or change its DNS later. Do not describe this as
complete SSRF protection or reuse it for server-side URL fetching without a
separate resolver/connection policy. Existing stored destinations are not rewritten.

Aliases are case-sensitive, 3–32 ASCII letters/digits/hyphen/underscore. Reserved
route names are rejected case-insensitively and shared with random allocation.
Use the existing atomic ON CONFLICT mechanism: a custom-alias conflict returns
409 immediately, while random generation retains bounded retries. Expired and
deleted aliases remain allocated to avoid changing old links' destinations.

Require ISO 8601 expiry with an explicit timezone and a future instant. Convert
to UTC and store as naive UTC in the existing timestamp-without-time-zone column.
The frontend datetime-local field represents the user's local time and sends an
ISO UTC instant. New links without an expiry keep their previous lifetime.

Add Alembic 0003 to widen both urls.short_code and analytics.short_code to 32,
recreating the foreign key. Downgrade refuses to truncate existing longer codes.
Run upgrade head before deploying the new API or accepting long aliases.

## Cache and concurrent deletion

Eviction alone is insufficient: Redis can be unavailable, and an in-flight read
can repopulate stale entries after a delete. Every redirect reads the primary
PostgreSQL row using SELECT FOR SHARE and refreshes ORM identity-map state.
Deleted/missing rows return 404; expired rows return 410 before cached data is
used. The delete UPDATE takes a conflicting row lock, commits deleted_at, then
attempts cache eviction. A redirect that acquired its lock first is ordered before
the delete; readers after deletion observe the tombstone. The request DB session
holds its lock until dependency cleanup. No lock/transaction is shared between
replicas. Run these reads against the primary, not an asynchronously replicated DB.

Cache hits cannot bypass lifecycle checks. Even a failed eviction cannot restore
a deleted mapping. Cache writes use an absolute Redis PXAT deadline no later than
expiry or the default 24-hour TTL; subsecond remaining lifetimes are not cached.
This avoids extending expiry due to Redis command latency. Expiry is checked again
after potentially blocking click publication. As with any HTTP response, validity
is evaluated during request processing; delivery latency is not controlled.

The tradeoff is one PostgreSQL lookup per redirect, including cache hits, plus a
row lock held during the request. A database outage fails closed. Concurrent
requests/deletes may wait, especially while the existing synchronous Kafka publish
blocks. A scalable cache invalidation/versioning protocol and event-bus redesign
remain later work; no unreliable cache-only shortcut is introduced here.

## API and security scope

DELETE /urls/{code} returns 204 with no body, or 404 for missing/already deleted.
GET /urls keeps its response shape and excludes deleted links (expired links are
still visible). Existing analytics rows are retained; this is soft deletion.
Ownership/authentication is not implemented in this step: deletion is currently
public, like the existing API. Do not claim API-key ownership enforcement.

OpenAPI describes the new inputs/statuses; the form adds only alias and expiry
fields and shows validation/conflict messages. No browser end-to-end test was run.
See tests/test_url_features.py for validation/API/cache tests and PostgreSQL
alias-race/delete-lock/downgrade tests. Earlier mocked service tests now supply
lifecycle metadata and assert that cache hits still consult PostgreSQL.

## Context

Aliases, expiry and soft deletion must remain correct when Redis caches destinations. URL input also needs an explicit boundary before storage and later classification.

## Consequences

Positive cache hits still consult durable lifecycle state. Cache eviction alone is insufficient for authorization; database failure can prevent redirects. Validation does not replace abuse review or future fetch-time DNS checks.
