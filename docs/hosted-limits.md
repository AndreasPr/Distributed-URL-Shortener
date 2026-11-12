# Hosted limits and degraded operation

- The **foreground healthy cache-hit redirect performs two Redis client commands**:
  one `EVAL` token bucket and one `GET` destination. The command-counting assembled
  app test in `tests/test_hosted_profile.py` verifies this. Lua's internal commands
  are not separate network round trips; provider billing may count them differently.
  Background event publication (`XADD`), stream polling/ack/lag, cache misses,
  invalidations and rejected-request telemetry are additional commands. This is not
  a claim of two total billable commands per click. Pipelining these two calls would
  couple pre-routing rate enforcement to endpoint loading without reducing commands.
- Cache hits still query PostgreSQL for deletion/expiry and abuse enforcement.
  Availability cannot survive PostgreSQL failure. Quota exhaustion does not bypass
  deletion, expiry, tenancy, authorization or blocking decisions.
- Only `APP_ROLE=all` uses the in-process fallback token bucket. Redis connection,
  timeout or recognized quota errors open the breaker immediately. Rate limits use
  the same route/principal/IP identity in a lock-protected, 10,000-entry LRU map.
  Capacity/refill/headers remain the same. Buckets reset on eviction/process restart
  and are independent across instances; switching to/from Redis can grant a fresh
  burst. This is a weaker abuse boundary than distributed limits.
- Local/kind writes keep their fail-closed policy. Hosted redirects fall back to
  PostgreSQL, and `redis_degraded_total` counts failed/bypassed guarded operations.
  After five seconds one half-open probe tries recovery. Invalid Redis commands are
  still errors, not silently treated as quota failures. `/health` reports Redis
  degraded while `/livez` remains healthy.
- In hosted mode Redis Streams operations share this breaker. Durable pending events
  can be recovered; the bounded in-memory click publisher eventually drops events
  if publishing cannot recover within its retry budget, or on process termination.
  `events_dropped_total` is the evidence. Creation events retain the database outbox.
- Idle consumers still poll Streams and collect lag. A low daily Redis quota can be
  exhausted without much user traffic. No quota-sustainability or exactly-once
  delivery claim is made. The database deduplicates analytics effects by event ID.
- Fake LLM with a zero budget makes no paid or live-provider call. It is not a real
  model accuracy demonstration. Configure a free/local provider deliberately if
  desired, accounting for resource use, timeout and privacy policy.
- One process/container shares CPU and memory; no independent scaling, high
  availability, durable local disk or guaranteed analytics freshness during sleep.
  Render cold boot/image startup may exceed one second. The subsecond test measures
  readiness-independent `/livez` after lifespan starts, not platform provisioning.
- Cooperative shutdown has a bounded deadline; stuck I/O can leave daemon threads
  unfinished. Do not interpret bounded termination as guaranteed final flush under
  an arbitrary database/network hang. Transactions/acks preserve replay safety.
