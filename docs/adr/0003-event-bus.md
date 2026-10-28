# ADR 0003: Versioned analytics events over Kafka or Redis Streams

Status: accepted for step 1.5. This requested filename is independent of the
existing baseline ADR numbering; existing records are not renamed.

## Context

Redirects previously called `KafkaProducer.send` and then `flush`. Both metadata
lookup and acknowledgement could block the request. The worker auto-committed
Kafka offsets, decoded JSON in the consumer, had no event deduplication or DLQ,
and only checked the batch timeout when another message arrived.

## Decision

Use `app/events/base.py`'s EventBus protocol: publish, group subscription, bounded
poll, explicit acknowledgement, lag and close. Kafka wraps the existing
`app/kafka` construction functions; Redis Streams uses XADD, XREADGROUP, XACK
and cursor-based XAUTOCLAIM. A process-local group-aware memory adapter supports
tests only. `EVENT_BUS` selects the adapter for direct Python execution.

Every click carries a UUID `event_id`, `event_type=url.clicked`, UTC-aware
`occurred_at`, schema version 1, `trace_context` (empty until step 3.1), and code.
Wire validation requires all envelope fields: old `{short_code: ...}` messages
are dead-lettered, never assigned a fresh UUID on each redelivery. No migration
is needed: the partial unique index on analytics.event_id already exists.

### Redirect isolation

FastAPI startup starts one daemon publisher thread per API process. Redirects
only construct the event and use `put_nowait` on a bounded queue (default 1,000).
The background thread does broker construction, send and acceptance confirmation.
Publication now retries with the same UUID (see ADR 0022) before exhaustion.
Queue-full and exhausted publications are abandoned locally and counted; warning logs are
rate-limited to one per 30 seconds. No retries or broker flush run on redirects.
Shutdown gives the publisher two seconds, drops queued leftovers, and cannot
force-kill an in-flight Python call. The queue is not an outbox: abrupt process
exit can lose queued events; a timeout may also hide a successful broker write.
This is intentionally best-effort analytics, not billing or guaranteed delivery.

### Worker consistency and batching

A consumer owns its polling, database session and timer in one thread. Bounded
polls (at most 200ms) drive a monotonic deadline even when no new messages arrive;
no second thread shares the SQLAlchemy session or KafkaConsumer. Default flush
is 100 messages or five seconds after the first buffered arrival. SIGTERM/SIGINT
sets a stop flag, then the final batch is flushed and resources are closed.
Compose/Kubernetes allow 120 seconds for worker shutdown; forced termination can
interrupt it, leaving broker deliveries unacknowledged.
Individual inserts use savepoints within a batch transaction, so a poison row
cannot discard healthy rows. This reduces commit overhead, not insert round trips.

Insert uses `ON CONFLICT (event_id) WHERE event_id IS NOT NULL DO NOTHING` and the
original occurrence timestamp. All Kafka offsets/Redis acknowledgements are
withheld until the transaction commits AND every rejected message has confirmed
DLQ publication. Kafka commits explicit next offsets per partition, not whatever
poll has fetched. If an ack fails after commit, retry inserts are harmless.
No acknowledgement skips an earlier buffered poison message.

Malformed JSON, unsupported versions, incomplete envelopes and deterministic
row failures get three attempts with exponential waits (0.25s, 0.5s by default).
The DLQ envelope includes the original bytes as base64, source topic, sanitized
exception-class reason and attempt count. Raw input/SQL parameters are not logged.
Database infrastructure errors are different: rollback, retain the batch, back
off exponentially up to five seconds, and never acknowledge or divert it to DLQ.
Shutdown cannot persist through a database outage: unacknowledged messages remain
recoverable by the next worker. Attempt counts are per processing run, not durable
across crashes. A crash between DLQ publication and ack can duplicate DLQ entries.

Kafka disables auto-commit and leaves JSON decoding to the worker. Redis consumer
groups start at `0-0`; XAUTOCLAIM scans pending records idle for at least 60 seconds
and retains its scan cursor. Claim timeout must exceed normal processing latency;
overlapping workers can still redeliver, so database idempotency remains necessary.
Redis stream length includes acknowledged history; pending count is the group's
unacknowledged work, not total unread lag. Kafka lag uses end minus committed
offsets. Lag is sampled every five seconds. Worker Prometheus metrics listen on
8001 and are scraped in both Compose and Kubernetes.

### Deployment and lightweight tradeoffs

Compose's `kafka` profile runs api/worker plus Kafka and retained ZooKeeper;
`redis-streams` runs api-redis/worker-redis plus Redis, without either Kafka service.
Each profile explicitly sets the adapter on both processes; `.env` EVENT_BUS does
not override the selected profile. Shared network aliases preserve Prometheus
scraping. Start exactly one profile; shut it down before switching, without `-v`.
Plain `docker compose up` starts only common infrastructure; `make up` defaults
to Kafka, and `make up PROFILE=redis-streams` selects lightweight mode.
Kubernetes stays on Kafka via its ConfigMap and deployment environment references.

Redis reduces local broker processes and memory requirements. It gives up Kafka's
native partition-based parallelism and independently scalable distributed log.
A single stream has no Kafka partition ordering model; worker processing may
reorder on retries/reclaims. Throughput and long-retention capacity are not
benchmarked; Redis shares memory/CPU with the cache and is less suitable for long
backlogs. Compose enables AOF with a named Redis volume (default every-second
fsync is not zero-loss durability). Streams are not automatically trimmed because
trimming pending records loses work: operators must budget memory and deliberately
trim only safely processed history. DLQ storage is also unbounded. Kafka retains
its broker retention policy and can replay while records remain retained. Neither
local deployment provides replicated production durability.

### Alternatives

- Keep direct asynchronous Kafka send: metadata lookup can still block and ties
  redirects to Kafka. A bounded background queue isolates both real adapters.
- Durable transactional outbox: stronger acceptance/delivery guarantees, but adds
  request-path writes and a dispatcher; deferred rather than claimed here.
- Bulk insert all rows: faster, but one poison record can fail the entire batch.
  Savepoints preserve healthy work at the cost of extra database round trips.
- Independent timer thread: more shared-session/consumer synchronization. Bounded
  polling provides an idle-time deadline on the single consumer thread instead.

## Operations and validation

See [developer instructions](../developer.md#analytics-event-bus-step-15) and
[verification](../event-bus-verification.md). The CLI lists envelope metadata
without dumping payloads and replays valid original envelopes with the same UUID.
Malformed/unknown-version payloads are deliberately refused on replay; repair
or upgrade their schema deliberately before republishing. Inspection uses a fresh
group (Redis removes it on close; Kafka group retention cleans up inactive groups).
Replay uses a stable group, acknowledges only accepted republishes, and does not
delete DLQ history. Redis abandoned replay messages become eligible after the
claim timeout. A replay error stops the command without acknowledging that item.

References: [Kafka manual commit contract](https://kafka-python.readthedocs.io/en/2.2.17/apidoc/KafkaConsumer.html),
[Redis XAUTOCLAIM](https://redis.io/docs/latest/commands/xautoclaim/),
[Redis Streams](https://redis.io/docs/latest/develop/data-types/streams/).

## Consequences

Two adapters increase test and operational surface. Analytics effects are idempotent after delivery, while the request-side publisher remains a bounded in-memory queue. See ADR 0022 for its later retry policy.
