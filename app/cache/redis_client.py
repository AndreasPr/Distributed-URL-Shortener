import logging
import random
import time
import uuid
from types import ModuleType
from typing import Callable, TypeVar

try:
    import redis as redis_package
    from redis.backoff import NoBackoff
    from redis.retry import Retry

    redis: ModuleType | None = redis_package
except Exception:  # pragma: no cover - defensive
    redis = None

from app.cache.circuit_breaker import CircuitBreaker
from app.core.config import settings
from app.observability.metrics import (
    record_cache_error,
    record_cache_hit,
    record_cache_miss,
)

logger = logging.getLogger(__name__)


class _NullRedis:
    def get(self, *_a, **_kw):
        raise ConnectionError("Redis client unavailable")

    def set(self, *a, **k):
        raise ConnectionError("Redis client unavailable")

    def delete(self, *_a):
        raise ConnectionError("Redis client unavailable")

    def ping(self):
        raise ConnectionError("Redis client unavailable")

    def dbsize(self):
        raise ConnectionError("Redis client unavailable")


def _create_client():
    if redis is None:
        logger.warning("redis library not available; using NullRedis")
        return _NullRedis()
    try:
        return redis.Redis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=0.1,
            socket_timeout=0.1,
            retry=Retry(NoBackoff(), 0),
        )
    except Exception:
        logger.exception("Failed to create Redis client; using NullRedis")
        return _NullRedis()


redis_client = _create_client()
breaker = CircuitBreaker()


T = TypeVar("T")
_READ_ERRORS = (
    (
        redis.exceptions.ConnectionError,
        redis.exceptions.TimeoutError,
        ConnectionError,
        TimeoutError,
    )
    if redis is not None
    else (ConnectionError, TimeoutError)
)


def read_cache(operation: Callable[[], T]) -> T | None:
    """All Redis operations share the breaker; programming errors propagate."""
    generation = breaker.permit()
    if generation is None:
        record_cache_error()
        return None
    try:
        result = operation()
    except _READ_ERRORS:
        logger.exception("Redis read failed")
        record_cache_error()
        breaker.failure(generation)
        return None
    except Exception:
        # Do not strand the single half-open probe after a programming error.
        breaker.failure(generation)
        raise
    breaker.success(generation)
    return result


def jittered_ttl(base: int) -> int:
    return random.randint(max(1, (base * 9 + 9) // 10), max(1, base * 11 // 10))


def get_cache(key: str):
    value = read_cache(lambda: redis_client.get(key))
    if value is None:
        record_cache_miss()
    else:
        record_cache_hit()
    return value


_PUBLISH = """
if redis.call('GET', KEYS[2]) == ARGV[1] then
    redis.call('SET', KEYS[1], ARGV[2], 'PXAT', ARGV[3])
    return 1
end
return 0
"""


def set_cache(
    key: str,
    value: str,
    ttl: int = 86400,
    expires_at_ms: int | None = None,
    lock_token: str | None = None,
    jitter: bool = True,
) -> None:
    """Absolute deadline includes jitter, but never extends a link's expiry."""
    lifetime = jittered_ttl(ttl) if jitter else ttl
    deadline = int(time.time() * 1000) + lifetime * 1000
    if expires_at_ms is not None:
        deadline = min(deadline, expires_at_ms)
    try:
        if lock_token is None:
            read_cache(lambda: redis_client.set(key, value, pxat=deadline))
        else:
            # A mutation or expired lease revokes the loader's publication right.
            read_cache(
                lambda: redis_client.eval(
                    _PUBLISH, 2, key, "url-lock:" + key, lock_token, value, deadline
                )
            )
    except Exception:
        logger.exception("Failed to set cache")


def invalidate_cache(code: str) -> None:
    # One atomic DEL also fences late negative-cache fills after alias creation.
    try:
        read_cache(lambda: redis_client.delete(code, "url-lock:" + code))
    except Exception:
        logger.exception("Failed to invalidate cache")


def delete_cache(key: str) -> None:
    """Best-effort eviction; DB lifecycle checks remain authoritative."""
    try:
        read_cache(lambda: redis_client.delete(key))
    except Exception:
        logger.exception("Failed to evict cache")


LOCK_TTL_MS = 1500
_RELEASE_LOCK = """
if redis.call('GET', KEYS[1]) == ARGV[1] then
    return redis.call('DEL', KEYS[1])
end
return 0
"""


def acquire_lock(code: str) -> tuple[str | None, bool]:
    """Return (owner token, Redis reachable); never use a bare DEL to release."""
    token = uuid.uuid4().hex
    result = read_cache(
        lambda: bool(
            redis_client.set("url-lock:" + code, token, nx=True, px=LOCK_TTL_MS)
        )
    )
    return (token if result else None), result is not None


def release_lock(code: str, token: str) -> None:
    read_cache(lambda: redis_client.eval(_RELEASE_LOCK, 1, "url-lock:" + code, token))
