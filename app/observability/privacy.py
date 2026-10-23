"""One export boundary for API, analytics, and future abuse-worker telemetry."""

import re

from opentelemetry.context import Context
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import ReadableSpan, Span, SpanProcessor
from opentelemetry.trace import Link, SpanContext, Status


def redact(value: str) -> str:
    value = re.sub(r"https?://[^\s\"'<>]+", "[url redacted]", value, flags=re.I)
    value = re.sub(r"\?[^\s\"'<>]+", "[query redacted]", value)
    value = re.sub(r"(?i)bearer\s+[^\s,;\"']+", "[credential redacted]", value)
    value = re.sub(
        r"(?i)(?:x-api-key|api[_-]?key|authorization|password|token)"
        r"[\s\"']*[:=][\s\"']*[^\s,;\"'}]+",
        "[credential redacted]",
        value,
    )
    # Generated API keys are 43 URL-safe characters; also mask unlabelled tokens.
    return re.sub(r"[A-Za-z0-9_-]{32,}", "[token redacted]", value)


SAFE_ATTRIBUTES = {
    "http.method",
    "http.request.method",
    "http.status_code",
    "http.response.status_code",
    "http.route",
    "db.system",
    "db.operation",
    "messaging.system",
    "messaging.operation",
    "url.scheme",
    "url.host",
    "url.code",
}


def _clean_context(value: SpanContext) -> SpanContext:
    # tracestate is arbitrary vendor text supplied by callers, not an identifier.
    return SpanContext(
        value.trace_id, value.span_id, value.is_remote, value.trace_flags
    )


class PrivacySpanProcessor(SpanProcessor):
    """Sanitize before batching/export; discard SQL, headers, exception payloads.

    Unknown attributes are dropped rather than depending on every instrumentor
    remembering to redact. Context/links retain identifiers, never baggage.
    """

    def __init__(self, delegate: SpanProcessor) -> None:
        self.delegate = delegate

    def on_start(self, span: Span, parent_context: Context | None = None) -> None:
        self.delegate.on_start(span, parent_context)

    def on_end(self, span: ReadableSpan) -> None:
        attributes = {
            key: redact(value) if isinstance(value, str) else value
            for key, value in (span.attributes or {}).items()
            if key in SAFE_ATTRIBUTES and isinstance(value, (str, int, float, bool))
        }
        safe = ReadableSpan(
            name=redact(span.name),
            context=_clean_context(span.context) if span.context else None,
            parent=_clean_context(span.parent) if span.parent else None,
            resource=Resource(
                {
                    key: redact(str(value))
                    for key, value in span.resource.attributes.items()
                    if key in {"service.name", "service.version"}
                }
            ),
            attributes=attributes,
            events=(),
            links=[Link(_clean_context(link.context)) for link in span.links],
            kind=span.kind,
            status=Status(span.status.status_code),
            start_time=span.start_time,
            end_time=span.end_time,
            instrumentation_scope=span.instrumentation_scope,
        )
        self.delegate.on_end(safe)

    def shutdown(self) -> None:
        self.delegate.shutdown()

    def force_flush(self, timeout_millis: int = 30000) -> bool:
        return self.delegate.force_flush(timeout_millis)
