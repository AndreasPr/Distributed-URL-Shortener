"""Small explicit OTLP metric set. Never forward the entire Prometheus registry."""

import time
from collections.abc import Iterable

from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.metrics import Observation
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.metrics.view import ExplicitBucketHistogramAggregation, View
from opentelemetry.sdk.resources import Resource
from prometheus_client import REGISTRY
from starlette.routing import compile_path
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.observability.export_health import sdk_disabled
from app.observability.sampling import record_error

# At most 41 route values including "other", five status classes, no method label.
MAX_ROUTES = 40
BOUNDS = (0.025, 0.1, 0.25, 0.5, 2.0)
# Histogram buckets (+Inf included), sum/count and request counter, plus gauges.
SERIES_BUDGET = (MAX_ROUTES + 1) * 5 * (len(BOUNDS) + 4) + 32
COUNTERS = {
    "cache_hits_total": "relaymark_cache_hits",
    "cache_misses_total": "relaymark_cache_misses",
    "redis_degraded_total": "relaymark_redis_degraded",
    "auth_failure_total": "relaymark_auth_failures",
    "signups_total": "relaymark_signups",
    "links_created_total": "relaymark_links_created",
}
_provider: MeterProvider | None = None
_request_count = None
_request_latency = None


def counter_value(sample_name: str) -> Iterable[Observation]:
    # Collapse any internal labels, including auth reason, to a single series.
    total = sum(
        sample.value
        for family in REGISTRY.collect()
        for sample in family.samples
        if sample.name == sample_name
    )
    yield Observation(total)


def worker_lag(options=None) -> Iterable[Observation]:
    for family in REGISTRY.collect():
        for sample in family.samples:
            if sample.name == "hosted_worker_lag" and sample.labels.get("worker") in {
                "analytics",
                "abuse",
            }:
                yield Observation(sample.value, {"worker": sample.labels["worker"]})


def pool_usage(options=None) -> Iterable[Observation]:
    from sqlalchemy.pool import QueuePool

    from app.db.database import engine

    if engine is not None and isinstance(engine.pool, QueuePool):
        yield Observation(engine.pool.checkedout(), {"state": "used"})
        yield Observation(engine.pool.checkedin(), {"state": "idle"})


def init_cloud_metrics(resource: Resource, endpoint: str) -> None:
    global _provider, _request_count, _request_latency
    if sdk_disabled() or _provider is not None:
        return
    reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=endpoint.rstrip("/") + "/v1/metrics", timeout=5),
        export_interval_millis=60000,
        export_timeout_millis=5000,
    )
    _provider = MeterProvider(
        resource=resource,
        metric_readers=[reader],
        views=[
            View(
                instrument_name="relaymark_request_duration",
                aggregation=ExplicitBucketHistogramAggregation(BOUNDS),
            )
        ],
    )
    meter = _provider.get_meter(__name__)
    _request_count = meter.create_counter("relaymark_requests")
    _request_latency = meter.create_histogram("relaymark_request_duration", unit="s")
    for source, name in COUNTERS.items():

        def callback(options, source=source):
            return counter_value(source)

        meter.create_observable_counter(name, callbacks=[callback])
    meter.create_observable_gauge("relaymark_event_bus_lag", callbacks=[worker_lag])
    meter.create_observable_gauge(
        "relaymark_db_pool_connections", callbacks=[pool_usage]
    )
    meter.create_observable_gauge(
        "relaymark_heartbeat", callbacks=[lambda options: [Observation(1)]]
    )


def shutdown_cloud_metrics() -> None:
    if _provider is not None:
        _provider.shutdown(timeout_millis=1000)


class CloudRequestMetrics:
    """Outside exception middleware: include failures, never raw paths/headers."""

    def __init__(self, app: ASGIApp, routes: tuple[str, ...]):
        self.app = app
        self.routes = frozenset(sorted(set(routes))[:MAX_ROUTES])
        self.patterns = [
            (route, compile_path(route)[0])
            for route in dict.fromkeys(routes)
            if route in self.routes
        ]

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started = time.monotonic()
        status = 500

        async def capture(message: Message) -> None:
            nonlocal status
            if message["type"] == "http.response.start":
                status = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, capture)
        finally:
            route = getattr(scope.get("route"), "path", None)
            if route is None:
                # Pre-routing auth/limit/body-limit rejections still use templates.
                route = next(
                    (
                        name
                        for name, pattern in self.patterns
                        if pattern.fullmatch(scope.get("path", ""))
                    ),
                    "other",
                )
            route = route if route in self.routes else "other"
            if route not in {"/livez", "/health", "/metrics"}:
                attrs = {
                    "route": route,
                    "status_class": f"{min(5, max(1, status // 100))}xx",
                }
                if _request_count is not None:
                    _request_count.add(1, attrs)
                if _request_latency is not None:
                    _request_latency.record(time.monotonic() - started, attrs)
                if status >= 400:
                    record_error(route, status)
