"""JSON logs correlated at record creation, including background threads."""

import json
import logging
import os
from datetime import datetime, timezone

from opentelemetry import trace

from app.observability.privacy import redact

_service = "api"
_factory = logging.getLogRecordFactory()


class TraceIDFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        context = trace.get_current_span().get_span_context()
        record.trace_id = format(context.trace_id, "032x")
        record.span_id = format(context.span_id, "016x")
        record.service = _service
        record.msg = redact(record.getMessage())
        record.args = ()
        # Exception strings/stack traces can embed SQL parameters and credentials.
        record.exc_info = None
        record.exc_text = None
        record.stack_info = None
        return True


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps(
            {
                "timestamp": datetime.fromtimestamp(
                    record.created, timezone.utc
                ).isoformat(),
                "level": record.levelname,
                "message": redact(record.getMessage()),
                "service": getattr(record, "service", _service),
                "trace_id": getattr(record, "trace_id", "0" * 32),
                "span_id": getattr(record, "span_id", "0" * 16),
            }
        )


def _record_factory(*args, **kwargs):
    record = _factory(*args, **kwargs)
    TraceIDFilter().filter(record)
    return record


def configure_logging_with_tracing(service_name: str = "api") -> None:
    global _service
    _service = service_name
    logging.setLogRecordFactory(_record_factory)
    root = logging.getLogger()
    root.setLevel(os.getenv("LOG_LEVEL", "INFO"))
    if not root.handlers:
        root.addHandler(logging.StreamHandler())
    for handler in root.handlers:
        handler.setFormatter(JSONFormatter())
    # Uvicorn's raw access log contains arbitrary paths/query strings. The
    # instrumented response hook emits a correlated, payload-free replacement.
    logging.getLogger("uvicorn.access").disabled = True
    for name in ("uvicorn", "uvicorn.error"):
        logger = logging.getLogger(name)
        logger.handlers.clear()
        logger.propagate = True


def get_logger_with_tracing(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not any(isinstance(f, TraceIDFilter) for f in logger.filters):
        logger.addFilter(TraceIDFilter())
    return logger
