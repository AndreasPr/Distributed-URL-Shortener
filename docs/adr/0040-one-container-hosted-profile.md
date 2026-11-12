# 0040: Opt-in single-process hosted backend

## Context

The free hosted target permits one web container. Existing Compose/kind deployments
separate API, analytics and abuse processes. Their operational and failure behavior
must remain the default. Managed Redis quotas and transaction-mode PostgreSQL
poolers impose different constraints.

## Decision

Add `APP_ROLE` with default `api`; `all` embeds two supervised synchronous consumers
in dedicated daemon threads under FastAPI lifespan. Keep thread-owned sessions and
consumer groups, restart with capped exponential backoff, report freshness/liveness
and lag, and stop within a shared deadline. `worker` exposes only management paths.
Use a background transaction-scoped migration lock and gate business routes until
migration succeeds, while independent liveness is available immediately.

Hosted Redis errors use the shared breaker and bounded per-instance rate buckets;
local writes remain fail closed. Preserve the existing two-command foreground hit
path and assert its count rather than introduce a combined cache/limiter contract.
Use transaction-local SQL timeouts and a five-plus-two hosted connection pool.
The blueprint defaults to Redis Streams and fake inference with zero budget. No
real credentials, cloud resources or automatic deployment are created by this work.

## Consequences

Threads reuse existing consumers without an async rewrite, but cannot be safely
force-cancelled. A seven-second cooperative join is followed by daemon termination
if stuck; final flush is best effort and unacknowledged events remain replayable.
Worker crashes do not make redirects unavailable. A single container cannot offer
independent scaling or survive host failure. Per-instance limiter fallback weakens
global rate enforcement, explicitly trading abuse protection for hosted availability.
Startup migrations require owner privileges and successful readiness must be
checked separately from `/livez`. The hosted service has not been deployed or
measured on Render. Local and kind remain separate-process profiles.
