# OpenTelemetry

The current setup uses OTLP/HTTP, W3C event context, JSON logs and a shared privacy
filter. Follow [Observability: trace one click](observability.md) for configuration,
Jaeger instructions, instrumentation coverage, tests and limitations.

The earlier Jaeger Thrift/UDP setup and `url-shortener-api` service name have been
replaced. Current service names are `api` and `worker`.
