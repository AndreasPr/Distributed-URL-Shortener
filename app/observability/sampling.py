"""Head sampling cannot recover failed unsampled requests: emit error summaries."""

from opentelemetry import trace
from opentelemetry.sdk.trace.sampling import (
    ALWAYS_OFF,
    ALWAYS_ON,
    ParentBased,
    Sampler,
    TraceIdRatioBased,
)
from opentelemetry.trace import SpanKind


class RequestSampler(Sampler):
    def should_sample(
        self,
        parent_context,
        trace_id,
        name,
        kind=None,
        attributes=None,
        links=None,
        trace_state=None,
    ):
        sampler: Sampler
        attrs = attributes or {}
        route = attrs.get("http.route", "")
        method = attrs.get("http.method", attrs.get("http.request.method", ""))
        if kind == SpanKind.SERVER:
            if route in {"/livez", "/health"}:
                sampler = ALWAYS_OFF
            elif method in {"POST", "PUT", "PATCH", "DELETE"}:
                sampler = ALWAYS_ON
            elif route in {"/{code}", "/{short_code}"}:
                # Ignore caller sampled flags: they must not defeat the 10% cap.
                sampler = TraceIdRatioBased(0.1)
            else:
                sampler = ALWAYS_ON
        elif name == "http.error":
            sampler = ALWAYS_ON
        else:
            sampler = ParentBased(ALWAYS_ON)
        return sampler.should_sample(
            parent_context, trace_id, name, kind, attributes, links, trace_state
        )

    def get_description(self):
        return "redirect-head-10-percent; writes-all; error-summaries-all"


def record_error(route: str, status: int) -> None:
    from opentelemetry.context import Context

    with trace.get_tracer(__name__).start_as_current_span(
        "http.error",
        context=Context(),
        attributes={"http.route": route, "http.status_code": status},
    ) as span:
        span.set_status(trace.Status(trace.StatusCode.ERROR))
