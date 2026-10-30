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
    autonumber
    participant C as Client
    participant A as Shorten API
    participant R as Redis Rate Limiter
    participant D as PostgreSQL
    participant P as Outbox Publisher
    participant B as Event Bus

    C->>A: POST /shorten (API key, URL, optional alias/expiry)

    Note over C,A: Authentication and Input Validation
    A->>A: Authenticate API key and verify scope
    A->>A: Validate and normalize URL, alias, and expiry

    alt Invalid API key or insufficient scope
        A-->>C: 401 Unauthorized or 403 Forbidden
    else Invalid request
        A-->>C: 400 Bad Request
    else Valid request
        Note over A,R: Distributed Rate Limiting
        A->>R: Atomic per-key and route token bucket

        alt Rate limit exceeded
            R-->>A: Request denied
            A-->>C: 429 Too Many Requests
        else Rate limit allowed
            R-->>A: Request allowed

            Note over A,D: Atomic URL Creation and Outbox Insertion
            A->>D: Begin transaction
            A->>D: Insert URL with unique short code
            Note over A,D: Bounded random-code collision retries

            alt Custom alias already taken
                D-->>A: Unique constraint violation
                A->>D: Rollback transaction
                A-->>C: 409 Conflict
            else Random-code collisions exhausted
                A->>D: Rollback transaction
                A-->>C: 503 Service Unavailable
            else Short code successfully reserved
                A->>D: Insert url.created outbox record
                A->>D: Commit transaction
                D-->>A: Commit confirmed
                A-->>C: 201 Created (short URL, code, expiry)
            end
        end
    end

    Note over P,B: Asynchronous Transactional Outbox Relay
    P->>D: Read pending outbox records
    D-->>P: Return unpublished URL creation events

    loop For each pending event
        P->>B: Publish url.created with stable event ID

        alt Publication confirmed
            B-->>P: Acknowledge publication
            P->>D: Mark outbox record as published
        else Publication failed
            B--xP: Publish error or timeout
            P->>P: Schedule retry with backoff
        end
    end

    Note over B,P: Abuse Worker consumes events asynchronously
```

### Redirect: hit and miss

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant A as Redirect API
    participant R as Redis
    participant D as PostgreSQL
    participant Q as Background Click Queue

    Note over C,A: Public URL Redirection
    C->>A: GET /{code}
    A->>A: Validate short code format

    alt Invalid short code
        A-->>C: 404 Not Found
    else Valid short code
        Note over A,R: Distributed IP-Based Rate Limiting
        A->>R: Atomic public IP token bucket

        alt Rate limit exceeded
            R-->>A: Request denied
            A-->>C: 429 Too Many Requests
        else Allowed or Redis unavailable
            Note over A,R: Fail open on Redis infrastructure errors
            A->>A: Apply per-code in-process single-flight
            A->>R: Lookup cached destination

            alt Positive cache hit
                R-->>A: Cached destination
                A->>D: Check current lifecycle and abuse state
                Note over A,D: Cached destination is not authorization

            else Cache miss or Redis unavailable
                opt Redis available
                    A->>R: Attempt short-lived per-code lock
                    alt Lock held by another request
                        A->>A: Wait briefly with bounded timeout
                        A->>R: Re-read cached destination
                    else Lock acquired
                        R-->>A: Lock acquired
                    end
                end

                opt No usable destination after re-read
                    A->>D: Load destination, lifecycle, and abuse state
                    D-->>A: URL record and current status

                    opt Redis available
                        alt Active URL with valid destination
                            A->>R: Cache destination with jittered expiry-capped TTL
                        else Missing or deleted URL
                            A->>R: Cache short negative entry
                        end
                    end
                end

                opt Lock acquired
                    A->>R: Release lock using ownership token
                end
            end

            Note over A,D: Authoritative Status Evaluation

            alt Database unavailable
                D--xA: Database error or timeout
                A-->>C: 503 Service Unavailable
            else URL missing or deleted
                A-->>C: 404 Not Found
            else URL expired
                A-->>C: 410 Gone
            else URL blocked by abuse policy
                A-->>C: 451 Unavailable For Legal Reasons
            else URL pending review and restricted
                A-->>C: 403 Forbidden
            else URL active and allowed
                Note over A,Q: Asynchronous Click Analytics
                A->>Q: Submit click event to bounded background queue

                alt Queue accepts event
                    Q-->>A: Accepted locally
                else Queue full or unavailable
                    Q--xA: Event dropped or rejected
                    Note over A,Q: Analytics failure does not block redirect
                end

                A-->>C: 307 Temporary Redirect with Location header
            end
        end
    end

    Note over A,D: PostgreSQL is authoritative for lifecycle and abuse decisions
    Note over A,R: Redis failures must not bypass authoritative status checks
    Note over A,Q: Background queue submission is non-blocking, not durable delivery
```

Negative entries return missing without a positive-hit lifecycle lookup. The API rechecks expiry;
soft deletion evicts cache. Single-flight and leases coalesce overlap but a timed-out lease wait
can fall back to another DB read. This is bounded coordination, not an absolute distributed lock.

### Click analytics: idempotency and dead letters

```mermaid
sequenceDiagram
    autonumber
    participant P as Background Publisher
    participant B as Kafka / Redis Streams
    participant W as Analytics Worker
    participant D as PostgreSQL
    participant L as Dead-Letter Queue (DLQ)

    Note over P,B: Reliable Event Publishing
    P->>P: Generate event with stable UUID
    P->>B: Publish analytics event

    alt Publication successful
        B-->>P: Confirm publication
    else Transient publication failure
        B--xP: Timeout or broker error
        P->>P: Retry with bounded backoff and same UUID
        P->>B: Republish event
        Note over P,B: Publisher must retain failed events durably
    end

    Note over B,W: At-Least-Once Event Consumption
    B->>W: Deliver event via consumer group
    W->>W: Validate payload and schema version

    alt Valid event
        Note over W,D: Idempotent Batch Processing
        W->>W: Add event to pending batch

        Note over W,D: Flush by batch size or independent timer

        W->>D: BEGIN TRANSACTION
        W->>D: INSERT events ON CONFLICT (event_id) DO NOTHING
        W->>D: COMMIT

        alt Database commit successful
            D-->>W: Commit confirmed
            W->>B: Ack message / commit eligible offsets
        else Database infrastructure failure
            D--xW: Transaction failed or timed out
            W->>W: Retain batch and retry with backoff
            Note over W,B: Do not acknowledge uncommitted events
        end

    else Poison payload or unsupported schema
        Note over W,L: Controlled Failure Handling

        loop Up to 3 processing attempts
            W->>W: Retry validation/processing with backoff
        end

        W->>D: Commit any independent healthy batch
        D-->>W: Confirm healthy batch commit

        W->>L: Publish original event ID and safe error type

        alt DLQ publication successful
            L-->>W: Confirm durable publication
            W->>B: Ack poison event / commit eligible offsets
        else DLQ publication failed
            L--xW: Publication error
            W->>W: Retry DLQ publication with backoff
            Note over W,B: Do not acknowledge poison event
        end
    end

    Note over W,B: Graceful Shutdown and Recovery
    opt SIGTERM received
        W->>W: Stop accepting new deliveries
        W->>D: Attempt final pending batch flush

        alt Final commit successful
            D-->>W: Commit confirmed
            W->>B: Ack committed events / commit eligible offsets
        else Flush failed or shutdown deadline reached
            D--xW: Flush incomplete
            Note over W,B: Leave uncommitted events unacknowledged
        end
    end

    Note over B,D: Redelivery is safe through event ID deduplication
    Note over W,B: Kafka commits contiguous processed offsets per partition
```

The request-side queue is bounded and not durable across API crashes. Publish attempts default
to 60; final local abandonment increments the drop counter, but a lost acknowledgement can
still conceal broker acceptance. Strict chaos reconciliation intentionally detects ambiguity.
DLQ inspection/replay is an operator CLI action; replay preserves idempotent effects and does
not erase retained DLQ history. See [event ADR](adr/0030-event-bus.md).

### Abuse review

```mermaid
sequenceDiagram
    autonumber
    participant P as Outbox Publisher
    participant D as PostgreSQL
    participant B as Event Bus
    participant W as Abuse Worker
    participant R as Redis Cache
    participant L as LLM Provider

    Note over P,D: Transactional Outbox Publishing
    P->>D: Read pending URL creation outbox records
    D-->>P: Return unpublished records
    P->>B: Publish url.created with stable event ID
    B-->>P: Confirm publication
    P->>D: Mark outbox record as published

    Note over B,W: Asynchronous Abuse Detection
    B->>W: Deliver url.created event
    W->>D: Load URL and existing verdict
    D-->>W: URL metadata and verdict state

    alt Already processed
        W->>B: Ack duplicate event
    else Not processed
        W->>W: Compute URL-only heuristic features

        alt Clear low or high risk
            W->>W: Determine heuristic verdict
        else Gray zone
            W->>R: Lookup contextual domain verdict

            alt Valid cached verdict
                R-->>W: Return matching assessment
                W->>W: Reuse cached assessment
            else Cache miss or stale context
                W->>L: Send bounded sanitized URL context
                alt Valid model response
                    L-->>W: Structured risk assessment
                    W->>W: Validate schema and policy
                    opt Cache-eligible assessment
                        W->>R: Cache contextual assessment
                    end
                else Invalid response or provider failure
                    L-->>W: Invalid output or error
                    W->>W: Apply suspicious fallback verdict
                end
            end
        end

        W->>D: Persist verdict idempotently
        D-->>W: Confirm durable commit

        opt URL is blocked
            W->>R: Invalidate cached redirect entry
        end

        W->>B: Ack event after durable handling
    end
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
