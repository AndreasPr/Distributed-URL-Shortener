"""Bounded, payload-free exporter diagnostics; never log response bodies."""

import logging
import os
import threading
import time
from urllib.parse import unquote

import requests
from opentelemetry.instrumentation.utils import suppress_instrumentation


class ExportErrorThrottle(logging.Filter):
    """One sanitized diagnostic per ten minutes across trace/metric exporters."""

    def __init__(self, clock=time.monotonic):
        super().__init__()
        self.clock = clock
        self.last = float("-inf")
        self.lock = threading.Lock()

    def filter(self, record: logging.LogRecord) -> bool:
        if record.levelno < logging.WARNING:
            return True
        with self.lock:
            now = self.clock()
            if now - self.last < 600:
                return False
            self.last = now
        record.msg = (
            "OTLP export failed; check credentials/connectivity; "
            "repeats suppressed for 10 minutes"
        )
        record.args = ()
        record.exc_info = record.exc_text = record.stack_info = None
        return True


def install_export_throttle() -> None:
    throttle = ExportErrorThrottle()
    # Filters on ancestor loggers do not filter child records. Attach to emitters.
    for name in (
        "opentelemetry.exporter.otlp.proto.http.trace_exporter",
        "opentelemetry.exporter.otlp.proto.http.metric_exporter",
        "opentelemetry.sdk._shared_internal",
        "opentelemetry.sdk.metrics._internal.export",
        "opentelemetry.util.re",  # SDK header parser otherwise echoes invalid values.
    ):
        logger = logging.getLogger(name)
        if not any(isinstance(f, ExportErrorThrottle) for f in logger.filters):
            logger.addFilter(throttle)


def sdk_disabled() -> bool:
    return os.getenv("OTEL_SDK_DISABLED", "false").lower() == "true"


def startup_check(endpoint: str) -> str:
    category = "disabled"
    if not sdk_disabled():
        raw = os.getenv(
            "OTEL_EXPORTER_OTLP_TRACES_HEADERS",
            os.getenv("OTEL_EXPORTER_OTLP_HEADERS", ""),
        )
        headers = {
            key.strip(): unquote(value.strip())
            for item in raw.split(",")
            for key, sep, value in [item.partition("=")]
            if sep
        }
        headers["Content-Type"] = "application/x-protobuf"
        try:
            # Empty ExportTraceServiceRequest: no user data, one request, no retry.
            with (
                suppress_instrumentation(),
                requests.post(
                    endpoint.rstrip("/") + "/v1/traces",
                    data=b"",
                    headers=headers,
                    timeout=(1, 1),
                    allow_redirects=False,
                    stream=True,
                ) as response,
            ):
                category = (
                    "ok"
                    if 200 <= response.status_code < 300
                    else (
                        "unauthorized"
                        if response.status_code in {401, 403}
                        else "unreachable"
                    )
                )
        except (requests.RequestException, ValueError):
            category = "unreachable"
    if category != "ok":
        logging.getLogger(__name__).warning("OTLP startup check category=%s", category)
    return category
