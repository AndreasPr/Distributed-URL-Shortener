"""
OpenTelemetry Distributed Tracing Setup

Configures auto-instrumentation for:
- FastAPI (HTTP endpoints)
- Redis (cache calls)
- SQLAlchemy (database queries)
- Requests (HTTP client calls)

Exports traces to Jaeger for visualization and analysis.
"""

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


def _safe_imports():
    try:
        from opentelemetry import metrics, trace
        from opentelemetry.exporter.jaeger.thrift import JaegerExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.redis import RedisInstrumentor
        from opentelemetry.instrumentation.requests import RequestsInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        return {
            "metrics": metrics,
            "trace": trace,
            "JaegerExporter": JaegerExporter,
            "FastAPIInstrumentor": FastAPIInstrumentor,
            "RedisInstrumentor": RedisInstrumentor,
            "RequestsInstrumentor": RequestsInstrumentor,
            "SQLAlchemyInstrumentor": SQLAlchemyInstrumentor,
            "Resource": Resource,
            "TracerProvider": TracerProvider,
            "BatchSpanProcessor": BatchSpanProcessor,
        }
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("OpenTelemetry imports failed: %s", exc)
        return None


def init_tracing(service_name: str = "url-shortener") -> Optional[object]:
    imports = _safe_imports()
    if not imports:
        logger.info("OpenTelemetry not available; skipping tracing initialization")
        return None

    try:
        metrics = imports["metrics"]
        trace = imports["trace"]
        JaegerExporter = imports["JaegerExporter"]
        FastAPIInstrumentor = imports["FastAPIInstrumentor"]
        RedisInstrumentor = imports["RedisInstrumentor"]
        RequestsInstrumentor = imports["RequestsInstrumentor"]
        SQLAlchemyInstrumentor = imports["SQLAlchemyInstrumentor"]
        Resource = imports["Resource"]
        TracerProvider = imports["TracerProvider"]
        BatchSpanProcessor = imports["BatchSpanProcessor"]

        jaeger_host = os.getenv("JAEGER_AGENT_HOST", "localhost")
        jaeger_port = int(os.getenv("JAEGER_AGENT_PORT", 6831))
        jaeger_collector = os.getenv("JAEGER_COLLECTOR_ENDPOINT")

        if jaeger_collector:
            logger.info(
                "Initializing OpenTelemetry tracing (Jaeger collector: %s)", jaeger_collector
            )
            jaeger_exporter = JaegerExporter(collector_endpoint=jaeger_collector)
        else:
            logger.info(
                "Initializing OpenTelemetry tracing (Jaeger agent: %s:%s)", jaeger_host, jaeger_port
            )
            jaeger_exporter = JaegerExporter(
                agent_host_name=jaeger_host,
                agent_port=jaeger_port,
            )

        resource = Resource.create(
            {
                "service.name": service_name,
                "service.version": os.getenv("VERSION", "dev"),
            }
        )

        tracer_provider = TracerProvider(resource=resource)

        try:
            max_queue = int(os.getenv("OTEL_BSP_MAX_QUEUE", "2048"))
            schedule_delay = int(os.getenv("OTEL_BSP_SCHEDULE_DELAY_MS", "5000"))
            max_batch = int(os.getenv("OTEL_BSP_MAX_EXPORT_BATCH", "128"))
        except Exception:
            max_queue = 2048
            schedule_delay = 5000
            max_batch = 128

        tracer_provider.add_span_processor(
            BatchSpanProcessor(
                jaeger_exporter,
                max_queue_size=max_queue,
                schedule_delay_millis=schedule_delay,
                max_export_batch_size=max_batch,
            )
        )

        trace.set_tracer_provider(tracer_provider)

        logger.info("Auto-instrumenting Redis, SQLAlchemy, Requests")
        try:
            RedisInstrumentor().instrument()
        except Exception:
            logger.exception("Redis auto-instrumentation failed")
        try:
            SQLAlchemyInstrumentor().instrument()
        except Exception:
            logger.exception("SQLAlchemy auto-instrumentation failed")
        try:
            RequestsInstrumentor().instrument()
        except Exception:
            logger.exception("Requests auto-instrumentation failed")

        logger.info("OpenTelemetry tracing initialized successfully")

        return trace.get_tracer(__name__)

    except Exception as exc:
        logger.exception("Failed to initialize OpenTelemetry tracing: %s", exc)
        logger.info("Continuing without distributed tracing")
        return None


def get_tracer():
    """Get the global tracer instance if available, else return a noop-like object."""
    imports = _safe_imports()
    if not imports:
        class _NoopTracer:
            def start_as_current_span(self, *a, **k):
                class _Ctx:
                    def __enter__(self):
                        return None

                    def __exit__(self, exc_type, exc, tb):
                        return False

                return _Ctx()

        return _NoopTracer()

    trace = imports.get("trace")
    try:
        return trace.get_tracer(__name__)
    except Exception:
        return None
