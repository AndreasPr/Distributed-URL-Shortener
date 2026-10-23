# ADR 0009: event trace continuity and privacy at export

Status: accepted.

The existing FastAPI instrumentor was imported but never attached, SQLAlchemy
instrumentation did not explicitly target the existing engine, and trace context
was lost in the publisher thread. Worker writes could not be joined to clicks.
The old SDK/instrumentors also depended on missing pkg_resources.

We upgrade the coherent OpenTelemetry family to SDK/API/OTLP HTTP 1.45.1 and
instrumentors 0.66b1, replacing the discontinued Jaeger Thrift exporter.
Versions were verified against [SDK PyPI](https://pypi.org/project/opentelemetry-sdk/1.45.1/)
and [FastAPI instrumentor PyPI](https://pypi.org/project/opentelemetry-instrumentation-fastapi/0.66b1/).
OTLP uses the existing Jaeger container; no paid service is introduced.

A queued event first carries the request's traceparent. The background publisher
creates a producer span and replaces the carrier with its context before sending.
The consumer both parents to and links to that producer. A link alone would
create another trace, failing the one-click/one-trace requirement. Only traceparent
is propagated: baggage/tracestate and arbitrary headers can carry sensitive data.
Batch transactions and post-commit acknowledgement semantics remain unchanged.

Structured logs capture IDs at record creation, so formatting outside the active
context does not lose correlation. Privacy is enforced before export through an
attribute allowlist and before logging through redaction and omission of exception
payloads. Instrumentation-specific hooks alone are insufficient: new versions can
add URL/header/SQL fields. Exception events and stack details are intentionally
sacrificed for privacy; failure status/type and trace topology remain useful.

Tests use in-memory span export plus the real publisher thread and SQLAlchemy
instrumentation. They cover the future abuse-worker's shared privacy configuration,
not an implementation of that worker. Operational caveats live in observability.md.
