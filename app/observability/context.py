"""W3C trace context only: never forward baggage, headers or credentials."""

import json
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

propagator = TraceContextTextMapPropagator()


def inject_context() -> dict[str, str]:
    carrier: dict[str, str] = {}
    propagator.inject(carrier)
    return {key: value for key, value in carrier.items() if key == "traceparent"}


def extract_context(carrier: dict[str, str]) -> Context:
    return propagator.extract(
        {"traceparent": carrier.get("traceparent", "")}, context=Context()
    )


@contextmanager
def event_span(name: str, carrier: dict[str, str], kind: trace.SpanKind):
    context = extract_context(carrier)
    parent = trace.get_current_span(context).get_span_context()
    links = (
        [trace.Link(parent)]
        if parent.is_valid and kind == trace.SpanKind.CONSUMER
        else []
    )
    # Parent keeps producer and consumer in one trace; a link makes causality
    # explicit too. Invalid/missing context starts a new trace, never the prior event.
    with trace.get_tracer(__name__).start_as_current_span(
        name,
        context=context,
        kind=kind,
        links=links,
        record_exception=False,
        set_status_on_exception=False,
    ) as span:
        yield span


def wire_context(payload: bytes) -> dict[str, str]:
    try:
        document = json.loads(payload)
        carrier = document.get("trace_context", {})
        value = carrier.get("traceparent", "")
        return {"traceparent": value} if isinstance(value, str) else {}
    except (ValueError, AttributeError):
        return {}
