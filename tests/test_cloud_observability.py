"""No external services: real SDK exporters/readers with in-memory fake transport."""

import json
import logging
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
import requests
import yaml
from fastapi import FastAPI
from fastapi.testclient import TestClient
from opentelemetry.context import Context
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import InMemoryMetricReader
from opentelemetry.sdk.metrics.view import View, ExplicitBucketHistogramAggregation
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import SpanKind

from app.observability import cloud_metrics as cm
from app.observability import export_health as eh
from app.observability.privacy import PrivacySpanProcessor
from app.observability.sampling import RequestSampler


@pytest.mark.parametrize(
    "status,category",
    [
        (200, "ok"),
        (401, "unauthorized"),
        (403, "unauthorized"),
        (302, "unreachable"),
        (500, "unreachable"),
    ],
)
def test_startup_probe_is_one_bounded_payload_free_request(
    monkeypatch, caplog, status, category
):
    monkeypatch.setenv("OTEL_SDK_DISABLED", "false")
    monkeypatch.delenv("OTEL_EXPORTER_OTLP_TRACES_HEADERS", raising=False)
    monkeypatch.setenv("OTEL_EXPORTER_OTLP_HEADERS", "Authorization=Basic%20abc%2Bdef")
    response = Mock()
    response.__enter__ = Mock(return_value=response)
    response.__exit__ = Mock()
    response.status_code = status
    post = Mock(return_value=response)
    monkeypatch.setattr(eh.requests, "post", post)
    assert eh.startup_check("https://collector.invalid/otlp/") == category
    post.assert_called_once_with(
        "https://collector.invalid/otlp/v1/traces",
        data=b"",
        headers={
            "Authorization": "Basic abc+def",
            "Content-Type": "application/x-protobuf",
        },
        timeout=(1, 1),
        allow_redirects=False,
        stream=True,
    )
    assert len(caplog.records) == (0 if category == "ok" else 1)
    assert "abc" not in caplog.text and "collector.invalid" not in caplog.text


def test_disabled_and_unreachable(monkeypatch, caplog):
    post = Mock(side_effect=requests.Timeout("Bearer secret https://secret.invalid"))
    monkeypatch.setattr(eh.requests, "post", post)
    monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
    assert eh.startup_check("unused") == "disabled"
    post.assert_not_called()
    monkeypatch.setenv("OTEL_SDK_DISABLED", "false")
    assert eh.startup_check("https://collector.invalid") == "unreachable"
    assert "secret" not in caplog.text


def test_exporter_errors_sanitized_and_throttled_across_signals():
    now = [0.0]
    throttle = eh.ExportErrorThrottle(lambda: now[0])

    def record():
        return logging.LogRecord(
            "exporter",
            logging.ERROR,
            "",
            0,
            "Failed to export spans batch Authorization=secret",
            (),
            None,
        )

    first = record()
    assert throttle.filter(first)
    assert "secret" not in first.getMessage()
    for t in range(5, 600, 5):
        now[0] = t
        assert not throttle.filter(record())
    now[0] = 600
    assert throttle.filter(record())


def test_sampling_distribution_writes_and_privacy():
    sampler = RequestSampler()
    decisions = [
        sampler.should_sample(
            Context(),
            n * (2**64 // 1000),
            "GET /{code}",
            SpanKind.SERVER,
            {"http.route": "/{code}", "http.method": "GET"},
        ).decision.is_sampled()
        for n in range(1000)
    ]
    assert 99 <= sum(decisions) <= 101
    for route in ("/livez", "/health"):
        assert not sampler.should_sample(
            Context(), 1, "probe", SpanKind.SERVER, {"http.route": route}
        ).decision.is_recording()
    exporter = InMemorySpanExporter()
    provider = TracerProvider(
        sampler=sampler,
        resource=Resource(
            {"service.name": "api", "deployment.environment": "production"}
        ),
    )
    provider.add_span_processor(PrivacySpanProcessor(SimpleSpanProcessor(exporter)))
    try:
        with provider.get_tracer("test").start_as_current_span(
            "POST /shorten",
            kind=SpanKind.SERVER,
            attributes={"http.method": "POST", "http.route": "/shorten"},
        ) as span:
            for key, value in {
                "url.code": "abc1234",
                "user.id": "user-secret",
                "workspace.id": "workspace-secret",
                "token": "token-secret",
                "http.request.header.authorization": "Bearer credential",
            }.items():
                span.set_attribute(key, value)
        spans = exporter.get_finished_spans()
        assert len(spans) == 1
        assert spans[0].resource.attributes["deployment.environment"] == "production"
        assert not any(
            value in str(spans[0].attributes)
            for value in [
                "abc1234",
                "user-secret",
                "workspace-secret",
                "token-secret",
                "credential",
            ]
        )
    finally:
        provider.shutdown()


def test_request_metrics_and_error_summary_no_raw_paths(monkeypatch):
    count, latency, error = Mock(), Mock(), Mock()
    monkeypatch.setattr(cm, "_request_count", count)
    monkeypatch.setattr(cm, "_request_latency", latency)
    monkeypatch.setattr(cm, "record_error", error)
    app = FastAPI()

    @app.get("/livez")
    def livez():
        return {}

    @app.get("/{code}")
    def redirect(code: str):
        from fastapi import HTTPException

        raise HTTPException(404)

    app.add_middleware(cm.CloudRequestMetrics, routes=("/livez", "/{code}"))
    with TestClient(app) as client:
        client.get("/livez")
        client.get(
            "/private-code?token=secret", headers={"Authorization": "Bearer secret"}
        )
        client.get("/not/a/route")
    assert count.call_count == 0  # instrument methods, not callable mock
    assert count.add.call_count == 2
    assert count.add.call_args_list[0].args == (
        1,
        {"route": "/{code}", "status_class": "4xx"},
    )
    assert count.add.call_args_list[1].args[1]["route"] == "other"
    assert error.call_count == 2
    assert "private-code" not in str(count.mock_calls) + str(latency.mock_calls) + str(
        error.mock_calls
    )


def test_cardinality_budget_with_real_sdk_and_adversarial_paths(monkeypatch):
    reader = InMemoryMetricReader()
    provider = MeterProvider(
        metric_readers=[reader],
        views=[
            View(
                instrument_name="relaymark_request_duration",
                aggregation=ExplicitBucketHistogramAggregation(cm.BOUNDS),
            )
        ],
    )
    meter = provider.get_meter("test")
    count = meter.create_counter("relaymark_requests")
    latency = meter.create_histogram("relaymark_request_duration", unit="s")
    try:
        # Exhaust every supported route/status combination, not just observed traffic.
        for route in [f"/route-{i}/{{id}}" for i in range(cm.MAX_ROUTES)] + ["other"]:
            for status in range(1, 6):
                attrs = {"route": route, "status_class": f"{status}xx"}
                count.add(1, attrs)
                latency.record(0.1, attrs)
        data = reader.get_metrics_data()
        series = 0
        for resource in data.resource_metrics:
            for scope in resource.scope_metrics:
                for metric in scope.metrics:
                    for point in metric.data.data_points:
                        assert set(point.attributes) == {"route", "status_class"}
                        series += (
                            len(point.bucket_counts) + 2
                            if hasattr(point, "bucket_counts")
                            else 1
                        )
        assert series + 32 == cm.SERIES_BUDGET < 2000
        from app.main import app

        routes = {getattr(r, "path", "other") for r in app.routes}
        assert len(routes) <= cm.MAX_ROUTES, "Review cardinality before adding routes"
    finally:
        provider.shutdown()


def test_metric_bridge_collapses_labels_and_only_allowed_workers(monkeypatch):
    samples = [
        SimpleNamespace(
            name="auth_failure_total", value=2, labels={"user_id": "secret"}
        ),
        SimpleNamespace(
            name="auth_failure_total", value=3, labels={"reason": "secret"}
        ),
        SimpleNamespace(
            name="hosted_worker_lag", value=4, labels={"worker": "analytics"}
        ),
        SimpleNamespace(
            name="hosted_worker_lag", value=50, labels={"worker": "private"}
        ),
    ]
    monkeypatch.setattr(
        cm,
        "REGISTRY",
        SimpleNamespace(collect=lambda: [SimpleNamespace(samples=samples)]),
    )
    values = list(cm.counter_value("auth_failure_total"))
    assert values[0].value == 5 and not values[0].attributes
    lag = list(cm.worker_lag())
    assert len(lag) == 1 and lag[0].attributes == {"worker": "analytics"}


def test_blueprint_dashboard_settings_are_not_overwritten():
    blueprint = yaml.safe_load(Path("render.yaml").read_text())
    env = {item["key"]: item for item in blueprint["services"][0]["envVars"]}
    for key in (
        "OTEL_SDK_DISABLED",
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "OTEL_EXPORTER_OTLP_HEADERS",
    ):
        assert env[key] == {"key": key, "sync": False}


def test_metrics_export_setup_disabled_and_enabled(monkeypatch):
    monkeypatch.setattr(cm, "_provider", None)
    monkeypatch.setattr(cm, "_request_count", None)
    monkeypatch.setattr(cm, "_request_latency", None)
    exporter = Mock()
    monkeypatch.setattr(cm, "OTLPMetricExporter", exporter)
    reader = InMemoryMetricReader()
    reader_factory = Mock(return_value=reader)
    monkeypatch.setattr(cm, "PeriodicExportingMetricReader", reader_factory)
    monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
    resource = Resource({"service.name": "api", "deployment.environment": "production"})
    cm.init_cloud_metrics(resource, "https://collector.invalid/otlp")
    exporter.assert_not_called()
    monkeypatch.setenv("OTEL_SDK_DISABLED", "false")
    cm.init_cloud_metrics(resource, "https://collector.invalid/otlp")
    exporter.assert_called_once_with(
        endpoint="https://collector.invalid/otlp/v1/metrics", timeout=5
    )
    assert reader_factory.call_args.kwargs["export_interval_millis"] == 60000
    try:
        cm._request_count.add(1, {"route": "/{code}", "status_class": "3xx"})
        data = reader.get_metrics_data()
        metrics = data.resource_metrics[0].scope_metrics[0].metrics
        names = {m.name for m in metrics}
        assert set(cm.COUNTERS.values()) <= names
        assert "relaymark_heartbeat" in names
        assert "llm_requests_total" not in names
    finally:
        cm.shutdown_cloud_metrics()


def test_real_instrumentation_sampling_health_exclusion_and_error_summary(monkeypatch):
    from opentelemetry import trace
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from app.observability import tracing

    exporter = InMemorySpanExporter()
    # IDs above the ratio threshold deterministically exclude redirects.
    from opentelemetry.sdk.trace.id_generator import RandomIdGenerator

    class UnsampledIds(RandomIdGenerator):
        def generate_trace_id(self):
            return 2**128 - 1

    provider = TracerProvider(sampler=RequestSampler(), id_generator=UnsampledIds())
    provider.add_span_processor(PrivacySpanProcessor(SimpleSpanProcessor(exporter)))
    monkeypatch.setattr(
        trace, "get_tracer", lambda *a, **kw: provider.get_tracer("test")
    )
    app = FastAPI()

    @app.get("/health")
    @app.get("/livez")
    def probe():
        return {}

    @app.post("/shorten")
    def create():
        return {}

    @app.get("/{code}")
    def redirect(code: str):
        from fastapi import HTTPException

        if code == "bad":
            raise HTTPException(503)
        return {}

    app.add_middleware(
        cm.CloudRequestMetrics, routes=("/health", "/livez", "/shorten", "/{code}")
    )
    # Use production instrumentation arguments, but the test-owned SDK provider.
    original = FastAPIInstrumentor.instrument_app
    monkeypatch.setattr(
        FastAPIInstrumentor,
        "instrument_app",
        lambda app, **kw: original(app, tracer_provider=provider, **kw),
    )
    tracing.instrument_app(app)
    try:
        with TestClient(app) as client:
            client.get("/health")
            client.get("/livez?secret=hidden")
            client.get("/good")
            client.get("/bad")
            client.post(
                "/shorten",
                headers={"traceparent": "00-" + "1" * 32 + "-" + "2" * 16 + "-00"},
            )
        spans = exporter.get_finished_spans()
        assert not any("/health" in s.name or "/livez" in s.name for s in spans)
        assert not any(
            s.kind == SpanKind.SERVER and s.attributes.get("http.route") == "/{code}"
            for s in spans
        )
        assert any(
            s.kind == SpanKind.SERVER and s.attributes.get("http.route") == "/shorten"
            for s in spans
        )
        errors = [s for s in spans if s.name == "http.error"]
        assert len(errors) == 1 and errors[0].attributes["http.status_code"] == 503
        assert errors[0].parent is None
    finally:
        FastAPIInstrumentor.uninstrument_app(app)
        provider.shutdown()


def test_cloud_assets_have_email_route_and_required_alerts():
    root = Path("grafana/cloud")
    dashboard = json.loads((root / "dashboard.json").read_text())
    assert len(dashboard["panels"]) == 10
    rules = [json.loads(p.read_text()) for p in root.glob("hosted-*.json")]
    assert {r["uid"] for r in rules} == {
        "hosted-5xx",
        "hosted-latency",
        "hosted-no-data",
        "hosted-redis",
    }
    for rule in rules:
        assert rule["labels"]["project"] == "relaymark"
        assert rule["condition"] == "C"
        assert all(
            s not in str(rule) for s in ["short_code", "user_id", "workspace_id"]
        )
    no_data = next(r for r in rules if r["uid"] == "hosted-no-data")
    assert (
        no_data["data"][0]["model"]["expr"]
        == "absent_over_time(relaymark_heartbeat[10m])"
    )
    assert (
        json.loads((root / "email-contact-point.json").read_text())["type"] == "email"
    )


def test_real_exporter_401_messages_are_throttled_and_body_is_not_logged(
    monkeypatch, caplog
):
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.trace.export import SpanExportResult

    names = (
        "opentelemetry.exporter.otlp.proto.http.trace_exporter",
        "opentelemetry.exporter.otlp.proto.http.metric_exporter",
        "opentelemetry.sdk._shared_internal",
        "opentelemetry.sdk.metrics._internal.export",
        "opentelemetry.util.re",
    )
    for name in names:
        monkeypatch.setattr(logging.getLogger(name), "filters", [])
    eh.install_export_throttle()
    eh.install_export_throttle()
    assert len(logging.getLogger(names[0]).filters) == 1
    response = requests.Response()
    response.status_code = 401
    response.reason = "credential-body-secret"
    response._content = b"credential-body-secret"
    session = Mock(spec=requests.Session)
    session.request.return_value = response
    exporter = OTLPSpanExporter(
        endpoint="https://collector.invalid/v1/traces",
        session=session,
        timeout=1,
        headers={"Authorization": "Basic secret"},
    )
    try:
        for _ in range(4):
            assert exporter.export([]) == SpanExportResult.FAILURE
        records = [r for r in caplog.records if r.name == names[0]]
        assert len(records) == 1
        assert "credential-body-secret" not in caplog.text
        assert "secret" not in caplog.text
        assert "repeats suppressed" in records[0].getMessage()
    finally:
        exporter.shutdown()


def test_pre_routing_rejections_have_template_labels(monkeypatch):
    import asyncio

    count = Mock()
    monkeypatch.setattr(cm, "_request_count", count)
    monkeypatch.setattr(cm, "_request_latency", None)
    monkeypatch.setattr(cm, "record_error", Mock())

    async def reject(scope, receive, send):
        await send({"type": "http.response.start", "status": 429, "headers": []})

    async def discard(message):
        pass

    middleware = cm.CloudRequestMetrics(
        reject, routes=("/workspaces/{workspace_id}/members",)
    )
    asyncio.run(
        middleware(
            {"type": "http", "path": "/workspaces/private-id/members"}, Mock(), discard
        )
    )
    assert count.add.call_args.args[1] == {
        "route": "/workspaces/{workspace_id}/members",
        "status_class": "4xx",
    }


def test_disabled_initialization_checks_once_without_exporters(monkeypatch):
    from app.observability import tracing

    monkeypatch.setattr(tracing, "_provider", None)
    monkeypatch.setattr(tracing, "_check_started", False)
    monkeypatch.setenv("OTEL_SDK_DISABLED", "true")
    thread = Mock()
    exporter = Mock()
    monkeypatch.setattr(tracing, "Thread", thread)
    monkeypatch.setattr(tracing, "OTLPSpanExporter", exporter)
    monkeypatch.setattr(tracing, "init_cloud_metrics", exporter)
    tracing.init_tracing()
    tracing.init_tracing()
    thread.assert_called_once()
    exporter.assert_not_called()


def test_invalid_sdk_header_warning_does_not_echo_credentials(monkeypatch, caplog):
    from opentelemetry.util.re import parse_env_headers

    logger = logging.getLogger("opentelemetry.util.re")
    monkeypatch.setattr(logger, "filters", [])
    eh.install_export_throttle()
    parse_env_headers("malformed-private-credential")
    assert "malformed-private-credential" not in caplog.text
    assert "OTLP export failed" in caplog.text
