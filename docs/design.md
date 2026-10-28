# URL shortener: engineering design

**Status:** implemented local system with future capacity targets. Scope: a concise design review; rendered page count depends on diagram layout.
Source of truth: code and migrations, with [ADRs](adr/README.md), [SLOs](slo.md),
[performance](performance.md) and [failure evidence](chaos.md). No AWS deployment is claimed.

## Problem, goals and requirements

Provide manageable short links while keeping redirects responsive when caches or analytics
infrastructure fail. Demonstrate observable, testable boundaries between synchronous request
handling, durable state, asynchronous work and optional model inference. Local operation must
use free tools and must not require cloud credentials or live LLM calls.

Functional requirements implemented today: authenticated URL creation, optional aliases and
expiry; public redirects; soft deletion; scoped analytics access; asynchronous abuse verdicts
and admin review; on-demand MCP tools through the API. Validation allows only HTTP(S), requires
a hostname, limits URLs to 2,048 characters, rejects embedded credentials and prohibited literal
hosts/IP ranges. Generated codes are seven base62 characters; aliases are 3–32 characters with
reserved names excluded. SQL uniqueness resolves collisions across API replicas.

| Non-functional requirement | Target / current boundary |
|---|---|
| Stored URLs / redirect rate | **Future:** 100 million URLs, 10,000 redirects/s; sizing scenario, not established capacity |
| Redirect availability | 99.9% non-5xx over rolling 30 days; 4xx count as available, not successful redirects |
| Positive cache-hit latency | 95% of successful hit redirects below 100ms over 30 days |
| Cache-miss latency | 95% of successful miss redirects below 500ms over 30 days |
| Analytics freshness | 99% of unique eligible click events visible within 60s; missing/dropped events count against the target |
| Failure isolation | Click broker calls stay off request threads; bounded queues/timeouts/retries; no claim of lossless publication |
| Deployment / testing | Compose Kafka or Redis Streams; kind CI overlay; Docker-backed integration tests and offline fake inference |

Availability has an implemented SLI and multi-window burn alerts. Cache-cohort request latency
and complete freshness accounting are **future instrumentation**, not measurable compliance
from today's global cache counters or consumer lag. A 99.9% availability budget permits one
5xx per 1,000 observed requests. External DNS/ingress failures require future external probes.
The recorded mixed-load test is not a redirect-only latency SLO or a 30-day observation.

Non-goals: multi-region service, proven multi-AZ failover, guaranteed phishing prevention,
destination crawling, billing, global CDN, autonomous model tools, or a production AWS rollout.
The Terraform artifact models AWS resources but is validated only; applying it would cost money.

## Capacity assumptions and data model

Reuse [performance.md](performance.md), replacing assumptions with measurements before sizing:

| Resource | Arithmetic at the future target |
|---|---|
| URL heap + indexes | 100M × (400-byte row × 1.3 overhead + 100-byte indexes) = 62GB ≈ 57.7GiB |
| Provisioned URL storage | 2× maintenance/growth margin = 124GB; primary + replica = 248GB, excluding WAL/backups/other tables |
| Hot Redis cache | Hottest 1% = 1M entries × 500 bytes × 1.5 fragmentation = 750MB; replica doubles to 1.5GB |
| URL lookup misses | 10,000/s × (1 − 0.95 assumed hit rate) = 500/s |
| Database reads | Even one per-redirect check adds 10,000/s: at least 10,500/s in that simplified model; actual lifecycle **and** verdict queries can add more |
| Click writes | 10,000 rows/s; at 100 events/batch approximately 100 transactions/s, not 100 row writes/s |
| Analytics retention | 10,000 × 86,400 × 200 bytes = 172.8GB/day, 5.184TB/30 days before replicas/backups |

Redis also holds locks, rate buckets, negative entries, verdict cache and (in lightweight mode)
stream history. No automatic retention plan makes these sizing assumptions safe indefinitely.
Measure actual table/index sizes, query counts, evictions and backlog before extrapolating.

Alembic owns schema evolution; SQLAlchemy models describe these durable records:

| Table | Identity, fields and constraints |
|---|---|
| `urls` | Integer PK; unique nullable `short_code` (32 chars); text destination; creation/expiry/deletion timestamps; nullable string `created_by` |
| `analytics` | Integer PK; FK to code; click timestamp; nullable event UUID string with partial unique index; `(short_code, clicked_at)` index |
| `api_keys` | Integer PK; unique SHA-256 hash, display prefix, name, JSON scopes, creation/revocation/last-use timestamps |
| `url_verdicts` | Code PK/FK; verdict, score, JSON reasons, source/model, review decision and reviewer/time; CHECK constraints |
| `abuse_outbox` | Code PK/FK; unique event UUID, trace context and creation time; durable creation notification |

Ownership metadata is not a promise of complete tenant isolation. Nullable legacy fields remain
part of the schema. A stable event ID enables idempotent analytics effects; it does not make
broker delivery exactly once. See [migrations](migrations.md) and [security](security.md).

## API and responsibilities

| Surface | Responsibility / access |
|---|---|
| `POST /shorten`, `DELETE /urls/{code}` | Write scope; create or soft-delete; aliases can conflict with 409 |
| `GET /urls`, `/analytics/{code}`, `/urls/{code}/status` | Read scope; lists, clicks, lifecycle status |
| `GET /{code}` | Public 307 redirect; unknown/deleted 404, expired 410, blocked 451 |
| `/admin/flagged`, `/admin/flagged/{code}/review`, `/admin/activity/{code}` | Admin-scoped review and operational signals |
| `/health`, `/livez`, `/metrics` | Dependency health (503 on failure), process liveness, metrics; internal metrics port in Kubernetes |

FastAPI enforces authentication, validation and token buckets. PostgreSQL is authoritative;
Redis is an optimization and shared limiter. EventBus has Kafka, Redis Streams and test-memory
adapters. Analytics workers batch writes and acknowledge only after durable handling. The abuse
worker relays the outbox and evaluates URLs. The frontend stores its key in memory; the MCP
server validates tool inputs and calls the HTTP API, never the database. Prometheus/Grafana
provide metrics/alerts; Jaeger receives OTLP traces. Detailed schemas live in Swagger and
[API changes](api-changes.md); missing/invalid keys yield 401, insufficient scope 403, limits 429.

## Key flows

### Create

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant R as Redis limiter
    participant D as PostgreSQL
    participant W as Abuse worker
    C->>A: POST /shorten with API key, URL, optional alias/expiry
    A->>A: Validate key/scope and URL
    A->>R: Atomic per-key route token bucket
    A->>D: Insert unique code and abuse outbox in transaction
    Note over A,D: Random-code collision retries are bounded; taken alias returns 409
    D-->>A: Commit
    A-->>C: Short code
    W->>D: Read pending outbox (relay follows asynchronously)
```

### Redirect: hit and miss

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant R as Redis
    participant D as PostgreSQL
    participant Q as Background click queue
    C->>A: GET /code
    A->>R: Public IP token bucket; fail open on Redis error
    A->>A: Per-code in-process single-flight
    A->>R: Read cached destination
    alt Positive cache hit
        A->>D: Check deletion and expiry lifecycle
    else Miss or Redis unavailable
        A->>R: Short lock; contenders briefly wait/re-read
        A->>D: Read destination/lifecycle; fallback if Redis fails
        A->>R: Cache with jittered expiry-capped TTL (or short negative entry)
    end
    A->>D: Check abuse/review state for successful destination
    Note over A,D: Missing/deleted 404; expired 410; blocked 451; DB failure can be 5xx
    A->>Q: Enqueue click without waiting on broker
    A-->>C: 307 Location
```

Negative entries return missing without a positive-hit lifecycle lookup. The API rechecks expiry;
soft deletion evicts cache. Single-flight and leases coalesce overlap but a timed-out lease wait
can fall back to another DB read. This is bounded coordination, not an absolute distributed lock.

### Click analytics: idempotency and dead letters

```mermaid
sequenceDiagram
    participant P as Background publisher
    participant B as Kafka or Redis Streams
    participant W as Analytics worker
    participant D as PostgreSQL
    participant L as Dead-letter topic/stream
    P->>B: Publish UUID event; bounded retries retain ID
    B->>W: Group delivery / possible redelivery
    alt Valid event
        W->>D: Insert ON CONFLICT DO NOTHING on event ID
        Note over W,D: Flush by size or independent timer; SIGTERM attempts flush
        D-->>W: Commit
    else Poison payload or unsupported schema
        W->>W: Three processing attempts with backoff
        W->>D: Commit healthy work in batch
        W->>L: Publish dead letter with safe error type
        L-->>W: Confirm publication
    end
    W->>B: Ack / commit offsets after DB and any DLQ publication
    Note over W,B: DB infrastructure errors retain batch without ack; retry after backoff
```

The request-side queue is bounded and not durable across API crashes. Publish attempts default
to 60; final local abandonment increments the drop counter, but a lost acknowledgement can
still conceal broker acceptance. Strict chaos reconciliation intentionally detects ambiguity.
DLQ inspection/replay is an operator CLI action; replay preserves idempotent effects and does
not erase retained DLQ history. See [event ADR](adr/0003-event-bus.md).

### Abuse review

```mermaid
sequenceDiagram
    participant W as Abuse worker
    participant D as PostgreSQL
    participant B as Event bus
    participant R as Redis verdict cache
    participant L as LLM provider
    W->>D: Read durable creation outbox
    W->>B: Publish url.created with stable ID
    W->>D: Remove outbox after confirmed publication
    B->>W: Consume URL-created event
    W->>D: Load URL
    W->>W: Compute URL-only heuristic features (no fetch)
    alt Clear low/high risk
        W->>W: Decide with heuristics
    else Gray zone
        W->>R: Contextual registered-domain verdict cache lookup
        alt Usable cached verdict
            R-->>W: Reuse matching context
        else No usable cached verdict
            W->>L: Bounded sanitized domain/path as untrusted data
            L-->>W: Schema-validated verdict or controlled failure
            W->>R: Cache eligible assessment
        end
    end
    W->>D: Persist verdict; invalid model output becomes suspicious
    W->>R: Evict blocked link cache
    W->>B: Ack after durable handling
```

Domain caching is context-sensitive, not a blanket allowlist for every path. Suspicious URLs
still redirect pending review; admin allow/block overrides affect enforcement. Outbox durability
does not remove the window between creation and the first verdict.

## Failure modes and mitigations

| Failure | Implemented response / residual risk |
|---|---|
| Redis down | Short timeouts, circuit breaker and PostgreSQL redirect fallback; writes fail closed; `/health` degrades. Shared Streams is also unavailable. |
| PostgreSQL slow | Connection/pool/statement timeouts bound operations; readiness fails and redirects may fail even on cache hits. No DB circuit breaker or stale-authorization fallback. |
| Event bus down | Background retries isolate redirects; queue overflow/exhaustion can lose analytics. Abuse creation remains in its durable outbox until confirmed relay. |
| Worker crash | Manual ack after commit and event uniqueness tolerate redelivery; Redis pending recovery uses XAUTOCLAIM. Graceful-stop evidence is not proof for every crash point. |
| LLM down / quota exhausted | Strict timeouts, concurrency/budget/pacing controls, bounded transient retries; conservative suspicious fallback. Review load may rise; free-tier capacity is not guaranteed. |
| Poison event | Bounded processing attempts then DLQ; DB infrastructure failures are not silently classified as poison. Operator inspection/replay required. |
| Cache stampede | Local single-flight + Redis lease, brief wait/re-read, TTL jitter; cross-replica fallback can still duplicate DB work. |
| Malicious URL | Validation, asynchronous heuristics/model review, 451 enforcement and cache eviction; false negatives and pre-verdict redirects remain possible. |
| Leaked API key | Revoke through operator CLI, replace key; hashes protect stored secrets, scopes limit capabilities. Valid stolen keys remain usable until revoked. |

## Alternatives and rationale

- **307 versus 301:** current handlers return temporary 307. Permanent browser caching could
  bypass later expiry, deletion, blocking and click observation. 307 retains server mediation;
  it costs a request per navigation. See [redirect ADR](adr/0024-temporary-redirects.md).
- **Random versus sequence codes:** random base62 plus unique constraint avoids exposing ID
  order and central sequence coordination in application code. Sequence + keyed permutation
  offers deterministic uniqueness but adds key/rotation complexity; randomness is not secrecy.
- **Kafka versus Redis Streams:** both are implemented, not rejected universally. Kafka supplies
  partition/offset semantics with more infrastructure; shared Redis is lighter but couples cache
  and event outages and requires explicit retention/backlog management.
- **Asynchronous versus synchronous abuse:** async avoids model latency/quota on creation;
  synchronous gating would reduce the initial exposure window but worsen availability/latency.
- **Heuristics plus LLM versus LLM-only:** heuristic gating saves calls and preserves an offline
  default. LLM-only adds cost, variability and injection exposure; combined evaluation still must
  distinguish flagging from actual blocking and cannot establish universal detection accuracy.

## Security, privacy and free-tier data policy

Keys are high-entropy secrets stored as SHA-256 hashes, checked with constant-time comparison;
scopes and Redis Lua rate limits enforce the API boundary. Trusted proxy CIDRs gate forwarded
IP use. Exact CORS, bounded bodies, generic errors, non-root containers and Kubernetes network
policies reduce exposure; none substitutes for authentication or safe operator configuration.

URL validation is not a DNS-rebinding defense for a future page fetcher: this pipeline does not
fetch pages. Trace export allowlists and structured-log redaction omit full URLs, query strings,
keys and tokens. PostgreSQL necessarily retains destinations; access to storage and backups
remains sensitive. DLQ encoded payloads are not encrypted merely because they are base64.

Only non-sensitive domain/path data may be sent to a real LLM: remove query/fragment, cap length,
delimit quoted untrusted content, require a fixed output schema/vocabulary, and provide no tools.
Paths can themselves contain sensitive identifiers, so syntactic stripping is not a guarantee of
anonymization. Gemini free-tier prompts may be used by the provider; inspect current terms before
opting in. Ollama is local; FakeProvider is deterministic; optional Claude is not assumed free.
No live provider is required for tests. See [LLM policy](llm.md) and [threat model](threat-model.md).

## Future scaling and acceptance plan

**Future 10×** means 100,000 redirects/s relative to the unproven 10,000/s target, not relative
to a measured benchmark. Budget API replicas and DB pools together; separate event Redis from
cache, measure Kafka partitioning, batch writes, and partition/expire analytics history. Reduce
per-redirect database checks only after designing correct deletion/block invalidation. Read
replicas are candidates for stale-tolerant analytics, not automatic authorization decisions.

**Future 100×** means 1 million redirects/s and potentially 10 billion URLs if stored cardinality
also scales 100×. Linear assumptions imply 6.2TB URL heap/indexes and 17.28TB analytics/day
before margins/replicas. Evaluate sharded code ownership/routing, distributed cache capacity,
regional replication, retention/aggregation and edge redirects with explicit purge semantics.
None is implemented; replication/failover consistency and operational cost require new ADRs.

Acceptance today uses unit/Testcontainers tests, deployment smoke checks, privacy/contract tests,
and the preserved [chaos results](chaos.md). Future capacity acceptance requires repeatable hardware
budgets, sustained load and recovery trials, per-path SQL/latency measurement, full freshness
accounting and a genuine 30-day SLO window. Do not promote sizing arithmetic to a capacity claim.
