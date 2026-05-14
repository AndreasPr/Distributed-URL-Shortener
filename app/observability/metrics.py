from contextlib import contextmanager

from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator


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


def configure_metrics(app) -> None:
    instrumentator.instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


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