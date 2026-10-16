"""Share only overlapping loads; never retain a process-local destination cache."""

from concurrent.futures import Future, TimeoutError
from threading import Lock
from typing import Callable, Generic, TypeVar

from app.observability.metrics import cache_lock_wait_total

T = TypeVar("T")


class SingleFlight(Generic[T]):
    def __init__(self):
        self._lock = Lock()
        self._pending: dict[str, Future[T]] = {}

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._pending.pop(key, None)

    def run(self, key: str, load: Callable[[], T], wait: float = 0.25) -> T:
        with self._lock:
            future = self._pending.get(key)
            owner = future is None
            if future is None:
                future = Future()
                self._pending[key] = future
        if not owner:
            cache_lock_wait_total.inc()
            try:
                return future.result(timeout=wait)
            except TimeoutError:
                if future.done():
                    raise
                # Availability wins over indefinite serialization of a stuck load.
                return load()
        try:
            result = load()
            future.set_result(result)
            return result
        except BaseException as exc:
            future.set_exception(exc)
            raise
        finally:
            with self._lock:
                if self._pending.get(key) is future:
                    del self._pending[key]
