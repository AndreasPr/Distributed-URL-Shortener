from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

import app.services.url_service as module


@pytest.mark.parametrize("cached", [False, True])
def test_url_spans_only_include_origin_and_code(monkeypatch, cached):
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    monkeypatch.setattr(module, "tracer", provider.get_tracer("privacy-test"))
    destination = "https://user:password@example.com/private/path?token=secret#fragment"
    monkeypatch.setattr(module, "get_cache", lambda _: destination if cached else None)
    monkeypatch.setattr(module, "set_cache", Mock())
    monkeypatch.setattr(module, "publish_click_event", Mock())
    service = module.URLService()
    service.repo = Mock()
    service.repo.create_with_code.return_value = "abc"
    service.repo.get_by_code.return_value = SimpleNamespace(
        deleted_at=None, expires_at=None, long_url=destination
    )
    try:
        assert service.shorten(Mock(), destination) == "abc"
        assert service.resolve(Mock(), "abc") == destination
        spans = exporter.get_finished_spans()
        for span in spans:
            for value in (span.attributes or {}).values():
                assert not any(
                    secret in str(value)
                    for secret in [
                        "password",
                        "private",
                        "token",
                        "secret",
                        "fragment",
                        "user:",
                    ]
                )
        for name in ("url.shorten", "url.resolve"):
            attrs = next(s.attributes for s in spans if s.name == name)
            assert {k: v for k, v in attrs.items() if k.startswith("url.")} == {
                "url.scheme": "https",
                "url.host": "example.com",
                "url.code": "abc",
            }
    finally:
        provider.shutdown()


def test_auto_instrumented_redis_does_not_export_cached_url(monkeypatch):
    import redis

    from opentelemetry.instrumentation.redis import RedisInstrumentor
    from app.observability.tracing import _redact_redis_arguments

    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    monkeypatch.setattr(redis.Redis, "execute_command", lambda *a, **kw: True)
    instrumentor = RedisInstrumentor()
    instrumentor.instrument(
        tracer_provider=provider, request_hook=_redact_redis_arguments
    )
    try:
        redis.Redis().set("abc", "https://example.com/private?token=secret")
        spans = exporter.get_finished_spans()
        assert len(spans) == 1
        assert spans[0].attributes["db.statement"] == "[arguments redacted]"
        assert "private" not in str(spans[0].attributes)
        assert "secret" not in str(spans[0].attributes)
    finally:
        instrumentor.uninstrument()
        provider.shutdown()


def test_auto_instrumented_http_does_not_export_path_or_query(monkeypatch):
    import requests

    from opentelemetry.instrumentation.requests import RequestsInstrumentor
    from app.observability.tracing import _redact_http_url

    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    response = requests.Response()
    response.status_code = 200
    monkeypatch.setattr(requests.Session, "send", lambda *a, **kw: response)
    instrumentor = RequestsInstrumentor()
    instrumentor.instrument(tracer_provider=provider, request_hook=_redact_http_url)
    try:
        requests.get("https://user:password@example.com/private?token=secret")
        spans = exporter.get_finished_spans()
        assert len(spans) == 1
        attrs = spans[0].attributes
        assert attrs["http.url"] == "[redacted]"
        assert attrs["url.scheme"] == "https"
        assert attrs["url.host"] == "example.com"
        assert not any(
            s in str(attrs) for s in ["password", "private", "token", "secret"]
        )
    finally:
        instrumentor.uninstrument()
        provider.shutdown()


def test_privacy_hooks_redact_instrumentation_attributes():
    from requests import Request
    from app.observability.tracing import _redact_http_url, _redact_redis_arguments

    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    tracer = provider.get_tracer("hooks")
    destination = "https://user:password@example.com/private?token=secret"
    try:
        with tracer.start_as_current_span("redis") as span:
            span.set_attribute("db.statement", "SET abc " + destination)
            _redact_redis_arguments(span, None, ("SET", "abc", destination), {})
        with tracer.start_as_current_span("http") as span:
            span.set_attribute("http.url", destination)
            _redact_http_url(span, Request("GET", destination).prepare())
        spans = exporter.get_finished_spans()
        assert spans[0].attributes["db.statement"] == "[arguments redacted]"
        assert dict(spans[1].attributes) == {
            "http.url": "[redacted]",
            "url.scheme": "https",
            "url.host": "example.com",
        }
    finally:
        provider.shutdown()
