# ADR 0029: Bounded cache coordination and Redis failure isolation

Status: Accepted (step 1.4)

Renumbered from the duplicate 0002 cache record. This is separate from the earlier
0002-local-configuration-and-image-pins.md and updates the cache portion of
[ADR 0006](0006-url-validation-and-lifecycle.md).

## Context and decision

Step 1.3 validates every positive redirect in PostgreSQL so a failed Redis eviction
cannot resurrect a deleted link. Removing every DB check would require making
mutations unavailable during Redis failures, or a stronger durable invalidation
protocol. Preserve the existing deletion guarantee and write availability.

Use a process-wide, per-code single-flight registry of Futures for overlapping
loads. A cold burst in one process shares one immutable destination snapshot and
one PostgreSQL read, even when Redis is down. No ORM Session/row is shared between
threads, and there is no persistent in-process destination cache. Completed or
failed flights are removed; mutations detach old flights from new callers.
Followers still check expiry and record their own click events.

On a miss, acquire Redis SET NX PX with a random owner token and a 1500 ms lease.
Double-check the cache after acquiring the lease. Other processes wait up to
200 ms, polling every 10 ms, and re-read the result. Positive cross-process hits
still execute a lightweight SELECT of deleted_at/expires_at with FOR SHARE. Only
the lease holder reloads the full URL row on the normal, timely path. Local
single-flight followers share the owner's already-validated snapshot instead.

**Scope of the one-read guarantee:** one SQL read for an overlapping in-process
cold burst; one full-row load plus lifecycle checks across replicas. Positive
warm hits still need a lifecycle check. This deliberately preserves Step 1.3
rather than claiming zero DB reads for every positive cache hit. Existing shared
row locks order reads with deletes; requests overlapping a delete can be ordered
before it, while new readers see the committed tombstone.

Single-flight wait is capped at 250 ms. Slow/stalled loads, unavailable Redis, or
expired leases permit duplicate DB loads rather than unbounded request waits.
These locks mitigate stampedes; they are not an exactly-once or durable lock
system. Process crashes release leases through TTL. Lua publication and release
both compare the owner token: an expired/replaced owner cannot overwrite results
or delete a newer lock.

## Entries, expiry, and negative caching

Cache values are versioned JSON, containing destination and expiry, or a missing
marker with an absolute deadline. Old plain URL values and malformed entries are
reloaded, never blindly used. Positive entries use a base TTL of 86400 seconds
plus/minus 10 percent (77760–95040 seconds). An absolute PXAT deadline is capped
by expires_at; command latency cannot extend it. Entries with less than a second
remaining are not populated. Every redirect checks expiry again after click
publication, which remains synchronous in this step.

Unknown/deleted codes get a 30-second negative entry (no jitter). An embedded
deadline also prevents using an expired negative value even if an old cache
entry is encountered. Repeated negative hits skip PostgreSQL. Expired links retain
410 semantics rather than becoming negative 404 entries.

After any successful creation, including custom aliases, or deletion, atomically
DEL the entry and its lease. This revokes an in-flight loader's right to publish
an earlier negative result after alias creation. Invalidate local flights too.
The DB commit remains authoritative; failed Redis invalidation does not roll it
back. Positive entries always revalidate deletion, preserving fail-closed safety.

**Negative-cache consistency limit:** during a partial Redis outage, a creator
can commit while invalidation fails and another replica (or the same process after recovery) still sees the
old negative entry. That reader can return a stale 404 for at most the remaining
30-second negative TTL. Immediate visibility across this failure would require
rejecting writes or a durable invalidation protocol. Do not claim linearizable
negative caching. With working Redis, atomic lease revocation prevents late fills.
No aliases are reused after deletion.

## Circuit breaker and health

The cache adapter uses 100 ms connect/read timeouts and disables redis-py's
automatic retries. All adapter reads/writes/locks and health checks share a
thread-safe, process-local breaker: three consecutive connectivity failures open
it for five seconds. Successful operations reset the failure count. Once cool-down
expires, exactly one operation probes in half-open; success closes the breaker,
failure reopens it. Generation fencing prevents an older in-flight success from
closing a newly opened breaker. Other operations during open/half-open fail fast.
Already in-flight commands can still finish/fail; this is not a global cap on I/O.

Open circuits and real connection/timeout errors increment cache_errors_total.
Reads return None and cache coordination falls back to PostgreSQL. A healthy DB
can still redirect with Redis stopped; unknown codes still return 404. This does
not hide DB failures or programming errors. Timeouts bound individual socket
operations, not the entire request (DNS, database, and Kafka remain separate).

The existing /health path uses the same guarded read function: open/half-open
rejections report HTTP 503, status degraded, redis unreachable, with the existing
body shape. /health can perform the recovery probe after cool-down. /livez remains
dependency-free. The breaker is per worker/replica, not a cluster-wide policy.
Direct Redis consumers outside this adapter (such as future rate-limiter wiring)
do not automatically acquire its breaker protection.

## Metrics

- cache_fallback_total: DB loads after unavailable Redis lock acquisition or
  expiry of the distributed wait budget (ordinary healthy misses are excluded).
- cache_lock_wait_total: wait events, both local followers and distributed waiters;
  a request that times out locally can contribute another distributed wait event.
- circuit_breaker_state: gauge, 0 closed / 1 open / 2 half-open, per process.
- negative_cache_hits_total: valid missing-marker cache reads that avoid the DB.
- cache_errors_total: connectivity errors plus operations rejected by the breaker;
  a rejected operation increments the counter without performing network I/O.

## Alternatives and verification

Cache-only positive redirects would improve throughput but lose the failed-
eviction guarantee; fail-closed mutations would reduce write availability. A
local lock alone cannot coordinate replicas, and Redis alone cannot coalesce
loads while it is unavailable. Unbounded waits/retries amplify outages. Fixed
TTLs synchronize expirations; jitter spreads refreshes without extending expiry.

Tests cover cold bursts with Redis healthy/down, real PostgreSQL SELECT counting,
cross-process-style lease waiting, negative invalidation and late-fill fencing,
owner-safe release, timeouts, TTL bounds/deadlines, circuit transitions and one
probe, and health metrics. The real Redis Docker test performs Lua operations,
then stops only its disposable container and checks redirects/404s/health.
The complete results and limits are in [cache verification](../cache-verification.md).

## Consequences

Coordination and a circuit breaker bound Redis failure costs but do not remove PostgreSQL from positive-hit lifecycle checks. Lease expiry can permit duplicate loads; shared Redis failure also affects Streams deployments.
