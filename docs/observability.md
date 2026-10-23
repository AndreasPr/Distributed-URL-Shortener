# Trace one click

The API and analytics worker export OpenTelemetry spans over **OTLP/HTTP**.
Compose already includes Jaeger; its UI is **http://localhost:16686**.
The host-only OTLP listener is **127.0.0.1:4318**. Jaeger storage is in memory:
recreating it loses traces. Prometheus/Grafana remain separate from tracing.

## Start and find a click

1. Keep the existing `.env` and data volumes. Rebuild one profile:
   `docker compose --profile redis-streams up --build -d` or
   `docker compose --profile kafka up --build -d`.
2. Create a short link using your existing API key, or choose an existing active
   code. Make one request: `curl -I http://localhost:8000/CODE` is **not** suitable
   because HEAD is not the redirect route; use
   `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/CODE`.
   Do not use `-L` if you only want to exercise the shortener.
3. Allow the worker's flush interval (default five seconds) plus exporter batch
   delay. Open Jaeger, select service **api**, operation **GET /{code}**, and
   choose a recent trace. The same trace should contain `url.resolve`,
   `events.publish` (api), `analytics.process` (worker), and a database INSERT.
4. Alternatively, read `docker compose --profile redis-streams logs api-redis worker-redis`
   (Kafka: `logs api worker`). Copy `trace_id` from `HTTP response status=307`,
   `Click event published`, or `Click row staged` into Jaeger's trace-ID lookup.
   `Click row staged` is deliberately not a commit confirmation.

## Configuration and instrumentation

| Setting | Meaning |
| --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Base OTLP/HTTP URL, without `/v1/traces`; Compose defaults to `http://jaeger:4318`. Host-run processes default to `http://localhost:4318`. |
| `LOG_LEVEL` | JSON log verbosity; default INFO. |
| `EVENT_FLUSH_INTERVAL` / `EVENT_BATCH_SIZE` | Worker batching; determine when database processing appears. |

`app/observability/tracing.py` appends `/v1/traces`, uses a five-second exporter
request timeout and SDK batch export, and flushes at shutdown. Old
JAEGER_AGENT_HOST/PORT and collector variables no longer configure this app.
The standard SDK batch settings (`OTEL_BSP_*`) may be used; old bespoke shortened
names in earlier documentation are obsolete. Exporter outages must not block
redirects: publishing still uses the existing bounded background queue.

FastAPI is instrumented **before middleware construction**. SQLAlchemy explicitly
instruments the already-created application engine; Redis and Requests HTTP
instrumentation are registered per process. All routes, including health/liveness/metrics, are traced so handler logs
remain correlated; this increases trace volume during frequent scraping. `service.name` is **api** or **worker**, explicitly chosen by each
entrypoint rather than inherited from the shared Compose environment.

## Context, batching and retries

At enqueue time we capture only W3C `traceparent` from the active request. The
publisher thread extracts it, starts a PRODUCER span, then injects that span's
context into the serialized event. The worker starts a CONSUMER span with that
remote parent **and an explicit link**, so it remains in the same trace.
Invalid or missing context starts a new trace; it never inherits the previous
message's trace. Baggage, arbitrary headers and tracestate are not put in events.

Each message has its own processing span around validation, retries and the SQL
write/savepoint. The transaction commit and acknowledgement remain batch-level;
consumer spans represent processing, not a guarantee that the later commit
succeeded. Redelivery can produce multiple processing spans but database event
IDs still deduplicate rows. Malformed payloads receive an independent span when
no usable traceparent exists; dead letters retain only safe trace context.

## JSON logging and privacy

Each emitted application log has `timestamp`, `level`, `message`, `service`,
`trace_id` and `span_id`. IDs are captured when the record is created, including
publisher threads; outside a span they are zero. Uvicorn's raw access logging is
disabled in favor of a correlated response-status log without paths or headers.

A shared `PrivacySpanProcessor` filters spans **before export/batching**. It keeps
only an allowlist of method/status, route template, database operation/system,
messaging operation/system, and URL scheme/host/short-code attributes. SQL text,
parameters, full URLs, query strings, headers, exception events/descriptions and
unknown attributes are discarded. Span names and permitted text are also
redacted. Resource attributes are limited to service identity/version.

The logging boundary removes full HTTP(S) URLs, queries, credential-labelled
values, bearer tokens and long token-shaped strings. Raw exception/stack payloads
and arbitrary log extras are not serialized. This deliberately reduces debugging
detail and can redact harmless long identifiers. **Do not log request/event
payloads or secrets:** textual redaction is defense in depth, not permission to
emit arbitrary sensitive data or a guarantee against every encoding.

There is no abuse worker yet. Its future entrypoint must call
`configure_logging_with_tracing("abuse-worker")` and
`init_tracing("abuse-worker")`, and use `event_span` for event handling. The same
privacy boundary is tested for that service name; no nonexistent worker is claimed.

Kubernetes does not currently deploy Jaeger. Configure a reachable OTLP endpoint
and narrowly extend the default-deny NetworkPolicies for its collector before
expecting cluster traces. This change does not open cluster-wide egress.

## Verification

`make check` includes `tests/test_observability.py`: wire round-trip, malformed
context isolation, JSON trace IDs, privacy scans for all three service names,
and redirect → actual publisher thread → in-memory bus → worker → SQL insertion.
`tests/test_trace_privacy.py` also exercises real Redis/Requests instrumentation
with fake I/O. These tests do not prove broker delivery or Jaeger ingestion.
See [verification output](tracing-verification.md) for checks actually performed.
