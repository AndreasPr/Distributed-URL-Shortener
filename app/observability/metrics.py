from contextlib import contextmanager

from fastapi import HTTPException
from prometheus_client import Counter, Gauge, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings

instrumentator = Instrumentator(excluded_handlers=["/metrics"])

redirect_requests_total = Counter(
    "redirect_requests_total",
    "Total redirect requests served",
)

cache_hits_total = Counter(
    "cache_hits_total",
    "Total cache hits",
)

cache_misses_total = Counter(
    "cache_misses_total",
    "Total cache misses",
)

shorten_request_duration_seconds = Histogram(
    "shorten_request_duration_seconds",
    "Latency for shortening URLs",
)

analytics_events_processed_total = Counter(
    "analytics_events_processed_total",
    "Total analytics events processed by the worker",
)


def configure_metrics(app) -> None:
    instrumentator.instrument(app)
    if settings.METRICS_PORT:

        @app.get("/metrics", include_in_schema=False)
        def internal_metrics_only():
            raise HTTPException(404, "Not found")

    else:
        instrumentator.expose(app, endpoint="/metrics", include_in_schema=False)


def record_redirect() -> None:
    redirect_requests_total.inc()


def record_cache_hit() -> None:
    cache_hits_total.inc()


def record_cache_miss() -> None:
    cache_misses_total.inc()


@contextmanager
def track_shorten_latency():
    with shorten_request_duration_seconds.time():
        yield


def record_analytics_events_processed(count: int) -> None:
    analytics_events_processed_total.inc(count)


cache_errors_total = Counter(
    "cache_errors_total",
    "Total Redis connectivity errors and circuit-breaker rejections",
)


def record_cache_error() -> None:
    cache_errors_total.inc()


cache_fallback_total = Counter(
    "cache_fallback_total", "Redis unavailable: database fallback loads"
)
cache_lock_wait_total = Counter(
    "cache_lock_wait_total", "Requests waiting for a cache load"
)
circuit_breaker_state = Gauge(
    "circuit_breaker_state", "Redis circuit: 0 closed, 1 open, 2 half-open"
)
negative_cache_hits_total = Counter(
    "negative_cache_hits_total", "Unknown-code cache hits"
)


events_consumed_total = Counter("events_consumed_total", "Delivered analytics messages")
events_failed_total = Counter(
    "events_failed_total", "Failed analytics processing attempts"
)
dlq_events_total = Counter("dlq_events_total", "Confirmed dead-letter publications")
events_dropped_total = Counter(
    "events_dropped_total", "Click events dropped before broker acceptance"
)
consumer_lag = Gauge(
    "consumer_lag",
    "Broker backlog (stream length includes acknowledged records)",
    ["backend", "kind"],
)
