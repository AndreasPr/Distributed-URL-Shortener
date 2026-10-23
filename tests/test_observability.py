"""Trace continuity across the real publisher thread, event wire and SQL worker."""

import io
import json
import logging
from unittest.mock import Mock

import pytest
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.testclient import TestClient
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind

from app.core.config import settings
from app.events.memory import InMemoryEventBus
from app.events.models import ClickEvent
from app.events.publisher import BackgroundPublisher
from app.observability.context import event_span, inject_context, extract_context
from app.observability.logging import JSONFormatter, TraceIDFilter
from app.observability.privacy import PrivacySpanProcessor
from app.workers.analytics_worker import AnalyticsWorker


@pytest.fixture
def telemetry(monkeypatch):
    import app.observability.logging as log_module

    old_factory = logging.getLogRecordFactory()
    logging.setLogRecordFactory(log_module._record_factory)
    exporter = InMemorySpanExporter()
    provider = TracerProvider(resource=Resource({"service.name": "test-process"}))
    provider.add_span_processor(PrivacySpanProcessor(SimpleSpanProcessor(exporter)))
    monkeypatch.setattr(
        trace, "get_tracer", lambda *args, **kwargs: provider.get_tracer("test")
    )
    try:
        yield provider, exporter
    finally:
        provider.shutdown()
        logging.setLogRecordFactory(old_factory)


def test_w3c_event_roundtrip_and_invalid_context_isolation(telemetry):
    provider, exporter = telemetry
    with provider.get_tracer("test").start_as_current_span(
        "producer", kind=SpanKind.PRODUCER
    ) as producer:
        event = ClickEvent(short_code="sample", trace_context=inject_context())
        wire = ClickEvent.from_wire(event.model_dump_json().encode())
        assert set(wire.trace_context) == {"traceparent"}
        assert (
            trace.get_current_span(extract_context(wire.trace_context))
            .get_span_context()
            .trace_id
            == producer.get_span_context().trace_id
        )
    with event_span("consumer", wire.trace_context, SpanKind.CONSUMER) as consumer:
        assert (
            consumer.get_span_context().trace_id == producer.get_span_context().trace_id
        )
    with event_span(
        "unrelated", {"traceparent": "invalid"}, SpanKind.CONSUMER
    ) as unrelated:
        assert (
            unrelated.get_span_context().trace_id
            != producer.get_span_context().trace_id
        )
    span = next(s for s in exporter.get_finished_spans() if s.name == "consumer")
    assert span.parent.span_id == producer.get_span_context().span_id
    assert span.links[0].context.span_id == producer.get_span_context().span_id


@pytest.mark.parametrize("service", ["api", "worker", "abuse-worker"])
def test_json_log_has_active_trace_and_no_secrets(telemetry, monkeypatch, service):
    import app.observability.logging as log_module

    monkeypatch.setattr(log_module, "_service", service)
    provider, exporter = telemetry
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JSONFormatter())
    handler.addFilter(TraceIDFilter())
    logger = logging.getLogger("privacy-test")
    logger.addHandler(handler)
    try:
        with provider.get_tracer("test").start_as_current_span("work") as span:
            logger.warning(
                "GET https://example.com/private?token=secret X-API-Key: key-value Authorization: Bearer credential"
            )
            expected = format(span.get_span_context().trace_id, "032x")
        record = json.loads(stream.getvalue())
        assert set(record) == {
            "timestamp",
            "level",
            "message",
            "service",
            "trace_id",
            "span_id",
        }
        assert record["service"] == service
        assert record["trace_id"] == expected
        assert record["span_id"] != "0" * 16
        assert not any(
            s in record["message"]
            for s in ["https://", "?token=", "key-value", "Bearer credential"]
        )
    finally:
        logger.removeHandler(handler)


@pytest.mark.parametrize("service", ["api", "worker", "abuse-worker"])
def test_privacy_export_boundary_for_every_process(service):
    exporter = InMemorySpanExporter()
    provider = TracerProvider(
        resource=Resource({"service.name": service, "secret": "Bearer resource-secret"})
    )
    provider.add_span_processor(PrivacySpanProcessor(SimpleSpanProcessor(exporter)))
    key = "A" * 43
    try:
        with provider.get_tracer("test").start_as_current_span(
            "HTTP https://example.com/private?token=secret"
        ) as span:
            for name in [
                "http.url",
                "url.full",
                "db.statement",
                "http.request.header.x_api_key",
                "url.host",
            ]:
                span.set_attribute(
                    name,
                    "https://example.com/private?token=secret Bearer private-token "
                    + key,
                )
            span.add_event(
                "exception", {"exception.message": "Bearer exception-secret"}
            )
            span.set_status(
                trace.Status(trace.StatusCode.ERROR, "Bearer status-secret")
            )
        emitted = str(
            [
                (
                    s.name,
                    dict(s.attributes),
                    s.events,
                    s.status.description,
                    dict(s.resource.attributes),
                )
                for s in exporter.get_finished_spans()
            ]
        )
        assert not any(
            secret in emitted
            for secret in [
                "https://",
                "?token=",
                key,
                "private-token",
                "exception-secret",
                "status-secret",
                "resource-secret",
            ]
        )
    finally:
        provider.shutdown()


def test_redirect_publish_consume_sql_share_one_trace(
    telemetry, db_session, monkeypatch, caplog
):
    from app.models.url import URL
    import app.services.url_service as service

    provider, exporter = telemetry
    db_session.add(
        URL(short_code="sample", long_url="https://example.com/private?token=secret")
    )
    db_session.commit()
    instrumentor = SQLAlchemyInstrumentor()
    instrumentor.instrument(engine=db_session.get_bind(), tracer_provider=provider)
    bus = InMemoryEventBus()
    publisher = BackgroundPublisher(factory=lambda: bus)
    monkeypatch.setattr(service, "publish_click_event", publisher.enqueue)
    monkeypatch.setattr(service, "tracer", provider.get_tracer("url-service"))
    app = FastAPI()

    @app.get("/{code}")
    def redirect(code: str):
        return RedirectResponse(service.URLService().resolve(db_session, code))

    from app.observability.tracing import _response_hook

    caplog.set_level(logging.INFO)
    FastAPIInstrumentor.instrument_app(
        app, tracer_provider=provider, client_response_hook=_response_hook
    )
    try:
        publisher.start()
        with TestClient(app) as client:
            assert (
                client.get(
                    "/sample?token=secret",
                    headers={
                        "X-API-Key": "A" * 43,
                        "Authorization": "Bearer private-token",
                    },
                    follow_redirects=False,
                ).status_code
                == 307
            )
        publisher.close()
        bus.subscribe(settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP)
        worker = AnalyticsWorker(bus, db_session, backoff=0)
        worker.buffer.extend(bus.poll(0, 10))
        assert len(worker.buffer) == 1
        worker.flush()
        spans = exporter.get_finished_spans()
        server = next(s for s in spans if s.kind == SpanKind.SERVER)
        producer = next(s for s in spans if s.name == "events.publish")
        consumer = next(s for s in spans if s.name == "analytics.process")
        assert {s.context.trace_id for s in [server, producer, consumer]} == {
            server.context.trace_id
        }
        expected_trace = format(server.context.trace_id, "032x")
        messages = {record.getMessage(): record for record in caplog.records}
        for message in [
            "Click event published",
            "Click row staged",
            "HTTP response status=307",
        ]:
            assert messages[message].trace_id == expected_trace
            assert messages[message].span_id != "0" * 16
        emitted_logs = " ".join(record.getMessage() for record in caplog.records)
        assert not any(
            secret in emitted_logs
            for secret in ["https://", "?token=", "private-token", "A" * 43]
        )
        assert consumer.parent.span_id == producer.context.span_id
        assert consumer.links[0].context.span_id == producer.context.span_id
        assert any(
            s.parent
            and s.parent.span_id == consumer.context.span_id
            and "INSERT" in s.name.upper()
            for s in spans
        )
        emitted = str([(s.name, dict(s.attributes), s.events) for s in spans])
        assert not any(
            secret in emitted
            for secret in ["https://", "?token=", "private-token", "A" * 43, "/private"]
        )
    finally:
        publisher.close()
        instrumentor.uninstrument()
        FastAPIInstrumentor.uninstrument_app(app)


def test_init_instruments_existing_engine_and_uses_configured_otlp(monkeypatch):
    import app.observability.tracing as module

    monkeypatch.setattr(module, "_provider", None)
    factories = {}
    for name in [
        "TracerProvider",
        "OTLPSpanExporter",
        "RedisInstrumentor",
        "RequestsInstrumentor",
        "SQLAlchemyInstrumentor",
        "BatchSpanProcessor",
    ]:
        factories[name] = Mock()
        monkeypatch.setattr(module, name, factories[name])
    monkeypatch.setattr(module.trace, "set_tracer_provider", Mock())
    monkeypatch.setattr(
        settings, "OTEL_EXPORTER_OTLP_ENDPOINT", "http://collector:4318/"
    )
    module.init_tracing("worker")
    factories["OTLPSpanExporter"].assert_called_once_with(
        endpoint="http://collector:4318/v1/traces", timeout=5
    )
    assert (
        factories["TracerProvider"]
        .call_args.kwargs["resource"]
        .attributes["service.name"]
        == "worker"
    )
    from app.db.database import engine

    factories["SQLAlchemyInstrumentor"].return_value.instrument.assert_called_once_with(
        engine=engine
    )
    assert factories["RedisInstrumentor"].return_value.instrument.called
    assert factories["RequestsInstrumentor"].return_value.instrument.called
