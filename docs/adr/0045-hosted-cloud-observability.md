# 0045 — Bounded hosted telemetry with explicit sampling limitations

## Context

The single Render process already exports OTLP/HTTP traces and exposes local
Prometheus metrics. Blueprint sync forced telemetry off. Bad credentials generated
repeated exporter messages. Hosted telemetry must remain optional, low cardinality,
free-tier conscious and free of link/user identifiers. No live services are
contacted during this implementation.

## Decision

Make the three OTLP settings dashboard-owned (`sync: false`). Use one background
empty trace export as a startup check, with no retry/redirects, short connect/read
timeouts, categorical warnings and no payload logging. Sanitize and throttle SDK
export errors across traces/metrics at their emitting loggers once per 600 seconds.

Use head sampling for 10% of redirect server spans, propagate its decision to
children, and sample writes regardless of incoming sampled flags. Health probes
are excluded. A head sampler cannot preserve every full error trace: emit a
separate always-sampled `http.error` summary for each non-probe HTTP 4xx/5xx.
Tail sampling in a collector would retain full error traces but is future work,
requiring more buffering/resources; we do not claim that behavior here.

Keep PrivacySpanProcessor; remove short-code attributes at source and export.
Resource labels are service and environment. Push only an allowlisted metric set
with periodic OTLP metrics; keep local Prometheus unchanged. Bridge selected
existing counters instead of duplicating every hot-path update. Count signups and
link creation only after commit. Latency uses five explicit buckets, no method
label, at most 40 route templates plus `other` and five status classes. Bound
series below 2,000 per process/resource; unknown templates collapse to `other`.

Commit separate Grafana Cloud dashboard/alert/contact templates and manual import
instructions. Synthetic health checks are manual/hourly/one probe. No log exporter,
paid resources or credentials are introduced.

## Consequences

Metrics survive trace sampling but not process sleep or unflushed shutdown.
Counters reset at restart. Head sampling cannot retrospectively reconstruct an
error's request tree; summaries are separate traces. Error floods can still consume
trace quota. Arbitrary clients can influence incoming trace IDs; sampling is cost
control, not an adversarial quota boundary. Signups count first local provisioning,
not every upstream identity-provider signup. Multiple resources/replicas and Cloud
translation can increase account-wide series beyond the single-process budget.

A successful trace probe does not validate metrics permissions. Throttled failures
can delay diagnosis; startup checks and heartbeat/no-data help. Alerts for missing
data can fire during normal free-tier sleep. Live ingestion, imports and email
must be operator-verified; local tests prove neither uptime nor cloud delivery.
