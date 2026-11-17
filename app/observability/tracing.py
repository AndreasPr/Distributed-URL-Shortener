"""OTLP/HTTP export and shared privacy controls for every process."""

import logging
from threading import Thread
from urllib.parse import urlsplit

from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from requests import PreparedRequest

from app.core.config import settings
from app.observability.cloud_metrics import init_cloud_metrics, shutdown_cloud_metrics
from app.observability.export_health import (
    install_export_throttle,
    sdk_disabled,
    startup_check,
)
from app.observability.privacy import PrivacySpanProcessor
from app.observability.sampling import RequestSampler

logger = logging.getLogger(__name__)
_provider: TracerProvider | None = None
_check_started = False


def _redact_redis_arguments(span: trace.Span, instance, args, kwargs) -> None:
    span.set_attribute("db.statement", "[arguments redacted]")


def _redact_http_url(span: trace.Span, request: PreparedRequest) -> None:
    parsed = urlsplit(request.url or "")
    span.set_attribute("http.url", "[redacted]")
    span.set_attribute("url.scheme", parsed.scheme)
    if parsed.hostname:
        span.set_attribute("url.host", parsed.hostname)


def _response_hook(span, scope, message) -> None:
    if message.get("type") == "http.response.start":
        logger.info("HTTP response status=%s", message.get("status"))


def instrument_app(app: FastAPI) -> None:
    # Must run before Starlette constructs the middleware stack, not in startup.
    FastAPIInstrumentor.instrument_app(
        app,
        client_response_hook=_response_hook,
        excluded_urls=r"/livez(?:\?.*)?$,/health(?:\?.*)?$",
    )


def init_tracing(service_name: str = "api"):
    global _provider, _check_started
    if _provider is None:
        install_export_throttle()
        if not _check_started:
            _check_started = True
            Thread(
                target=startup_check,
                args=(settings.OTEL_EXPORTER_OTLP_ENDPOINT,),
                daemon=True,
            ).start()
        if sdk_disabled():
            return trace.get_tracer(__name__)
        resource = Resource(
            {
                "service.name": service_name,
                "deployment.environment": settings.ENVIRONMENT,
            }
        )
        _provider = TracerProvider(resource=resource, sampler=RequestSampler())
        # Local Jaeger accepts traces, not OTLP metrics; keep local Prometheus.
        if service_name == "api" and settings.ENVIRONMENT == "production":
            init_cloud_metrics(resource, settings.OTEL_EXPORTER_OTLP_ENDPOINT)
        exporter = OTLPSpanExporter(
            endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT.rstrip("/") + "/v1/traces",
            timeout=5,
        )
        _provider.add_span_processor(PrivacySpanProcessor(BatchSpanProcessor(exporter)))
        trace.set_tracer_provider(_provider)
        RedisInstrumentor().instrument(request_hook=_redact_redis_arguments)
        RequestsInstrumentor().instrument(request_hook=_redact_http_url)
        # The application engine already exists when startup runs.
        from app.db.database import engine

        SQLAlchemyInstrumentor().instrument(engine=engine)
    return trace.get_tracer(__name__)


def shutdown_tracing() -> None:
    shutdown_cloud_metrics()
    if _provider is not None:
        _provider.force_flush(timeout_millis=5000)
        _provider.shutdown()


def get_tracer():
    return trace.get_tracer(__name__)
