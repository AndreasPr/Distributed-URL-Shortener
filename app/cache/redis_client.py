import logging
import time
from types import ModuleType
from typing import Callable, TypeVar

try:
    import redis as redis_package

    redis: ModuleType | None = redis_package
except Exception:  # pragma: no cover - defensive
    redis = None

from app.core.config import settings
from app.observability.metrics import (
    record_cache_error,
    record_cache_hit,
    record_cache_miss,
)

logger = logging.getLogger(__name__)


class _NullRedis:
    def get(self, *_a, **_kw):
        return None

    def set(self, *a, **k):
        return None

    def delete(self, *_a):
        return 0

    def ping(self):
        return False

    def dbsize(self):
        return 0


def _create_client():
    if redis is None:
        logger.warning("redis library not available; using NullRedis")
        return _NullRedis()
    try:
        return redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
    except Exception:
        logger.exception("Failed to create Redis client; using NullRedis")
        return _NullRedis()


redis_client = _create_client()


T = TypeVar("T")
_READ_ERRORS = (
    (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError)
    if redis is not None
    else ()
)


def read_cache(operation: Callable[[], T]) -> T | None:
    """Read best-effort; programming errors must still propagate."""
    try:
        return operation()
    except _READ_ERRORS:
        logger.exception("Redis read failed")
        record_cache_error()
        return None


def get_cache(key: str):
    value = read_cache(lambda: redis_client.get(key))
    if value is None:
        record_cache_miss()
    else:
        record_cache_hit()
    return value


def set_cache(key: str, value: str, ttl: int = 86400, expires_at_ms: int | None = None):
    """Set cache with optional TTL (default: 24 hours)."""
    try:
        if expires_at_ms is not None:
            deadline = min(expires_at_ms, int(time.time() * 1000) + ttl * 1000)
            redis_client.set(key, value, pxat=deadline)
        else:
            redis_client.set(key, value, ex=ttl)
    except Exception:
        logger.exception("Failed to set cache")


def delete_cache(key: str) -> None:
    """Best-effort eviction; DB lifecycle checks remain authoritative."""
    try:
        redis_client.delete(key)
    except Exception:
        logger.exception("Failed to evict cache")
