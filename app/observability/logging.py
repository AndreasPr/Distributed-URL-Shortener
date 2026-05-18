"""
Logging configuration with OpenTelemetry trace ID correlation.

This module provides a logging filter that automatically adds trace IDs
to log records, enabling correlation between logs, metrics, and traces.
"""

import logging

from opentelemetry import trace


class TraceIDFilter(logging.Filter):
    """
    Logging filter that injects the current trace ID into log records.

    This allows logs to be correlated with traces in systems like Jaeger
    and enables debugging by connecting logs with the full distributed trace.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        """Add trace ID to the log record if an active span exists."""
        span = trace.get_current_span()
        if span and span.is_recording():
            trace_id = span.get_span_context().trace_id
            record.trace_id = f"{trace_id:032x}"
        else:
            record.trace_id = "none"
        return True


def configure_logging_with_tracing() -> None:
    """
    Configure the root logger to include trace IDs in all log messages.

    Call this function early in application startup, after OpenTelemetry
    has been initialized.
    """
    # Configure root logger
    root_logger = logging.getLogger()

    # Add trace ID filter
    trace_filter = TraceIDFilter()

    # Apply filter to all handlers
    for handler in root_logger.handlers:
        handler.addFilter(trace_filter)

    # Add filter to new handlers
    root_logger.addFilter(trace_filter)

    # Update formatter to include trace ID
    for handler in root_logger.handlers:
        if handler.formatter:
            # Get existing format
            fmt = handler.formatter._fmt
            # Add trace ID if not already present
            if "trace_id" not in fmt:
                new_fmt = fmt + " [trace_id=%(trace_id)s]"
                handler.setFormatter(logging.Formatter(new_fmt))


def get_logger_with_tracing(name: str) -> logging.Logger:
    """
    Get a logger with trace ID support.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Logger with trace ID filter applied
    """
    logger = logging.getLogger(name)
    if not any(isinstance(f, TraceIDFilter) for f in logger.filters):
        logger.addFilter(TraceIDFilter())
    return logger
