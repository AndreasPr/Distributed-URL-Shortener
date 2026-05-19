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

from opentelemetry import metrics, trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

logger = logging.getLogger(__name__)


def init_tracing(service_name: str = "url-shortener") -> Optional[trace.Tracer]:
    """
    Initialize OpenTelemetry distributed tracing.

    Args:
        service_name: Name of the service for traces

    Returns:
        Tracer instance for creating custom spans
    """
    jaeger_host = os.getenv("JAEGER_AGENT_HOST", "localhost")
    jaeger_port = int(os.getenv("JAEGER_AGENT_PORT", 6831))
    jaeger_collector = os.getenv("JAEGER_COLLECTOR_ENDPOINT")

    if jaeger_collector:
        logger.info(f"Initializing OpenTelemetry tracing (Jaeger collector: {jaeger_collector})")
        # Prefer HTTP collector when available (avoids UDP packet size limits)
        jaeger_exporter = JaegerExporter(collector_endpoint=jaeger_collector)
    else:
        logger.info(f"Initializing OpenTelemetry tracing (Jaeger agent: {jaeger_host}:{jaeger_port})")
        # Fallback to agent (UDP) for typical docker-compose setups
        jaeger_exporter = JaegerExporter(
            agent_host_name=jaeger_host,
            agent_port=jaeger_port,
        )

    # Create tracer provider with resource information
    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": os.getenv("VERSION", "dev"),
        }
    )

    tracer_provider = TracerProvider(resource=resource)

    # Configure BatchSpanProcessor with conservative defaults to avoid
    # generating UDP packets that are too large for the Jaeger agent.
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

    # Set as global tracer provider
    trace.set_tracer_provider(tracer_provider)

    # Auto-instrument key libraries (app instrumentation will be done separately in main.py)
    logger.info("Auto-instrumenting Redis, SQLAlchemy, Requests")
    RedisInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()
    RequestsInstrumentor().instrument()

    logger.info("OpenTelemetry tracing initialized successfully")

    # Return tracer for custom spans
    return trace.get_tracer(__name__)


def get_tracer() -> trace.Tracer:
    """Get the global tracer instance."""
    return trace.get_tracer(__name__)
