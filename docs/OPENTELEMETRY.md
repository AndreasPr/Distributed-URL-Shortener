# OpenTelemetry

The current setup uses OTLP/HTTP, W3C event context, JSON logs and a shared privacy
filter. Follow [Observability: trace one click](observability.md) for configuration,
Jaeger instructions, instrumentation coverage, tests and limitations.

The earlier Jaeger Thrift/UDP setup and `url-shortener-api` service name have been
replaced. Current service names are `api` and `worker`.


## Hosted Cloud export

Render uses `service.name=api` for the API and its in-process consumers, with
`deployment.environment=production`. OTLP/HTTP traces use `/v1/traces`; the small
metric set uses `/v1/metrics` every 60 seconds. Both read the generic OTLP headers
from the environment. `OTEL_SDK_DISABLED`, endpoint and headers are Blueprint
`sync: false` entries, configured privately in the Render dashboard.

Redirects use 10% head sampling; writes use 100%. A head sampler cannot know a
future status, so all HTTP 4xx/5xx responses emit independent `http.error` summary
spans (not full recovered request traces). Probe spans `/livez` and `/health` are
dropped. PrivacySpanProcessor still strips headers, SQL, events, exception text,
unknown attributes and token-like values, and now strips short codes too. User
and workspace IDs are never allowed attributes. Logging remains stdout only.

A single nonblocking startup trace probe categorizes disabled, unauthorized or
unreachable export without printing secrets; repeated exporter errors are
sanitized/throttled for ten minutes. Trace acceptance does not prove metric scope
or ingestion. See [runbook](hosting-runbook.md#8-grafana-cloud-and-uptime-monitoring),
[limits](hosted-limits.md#hosted-otlp-telemetry), and
[ADR 0045](adr/0045-hosted-cloud-observability.md). Verification is offline only.
