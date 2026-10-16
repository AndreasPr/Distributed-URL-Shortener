"""A thread-safe, process-local Redis circuit breaker."""

import time
from threading import Lock
from typing import Callable

from app.observability.metrics import circuit_breaker_state


class CircuitBreaker:
    def __init__(
        self,
        threshold: int = 3,
        cooldown: float = 5.0,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.threshold = threshold
        self.cooldown = cooldown
        self.clock = clock
        self._lock = Lock()
        self._state = 0  # closed=0, open=1, half-open=2
        self._failures = 0
        self._opened_at = 0.0
        self._generation = 0

    @property
    def state(self) -> int:
        with self._lock:
            return self._state

    def permit(self) -> int | None:
        with self._lock:
            if self._state == 1:
                if self.clock() - self._opened_at < self.cooldown:
                    return None
                self._state = 2
                self._generation += 1
                circuit_breaker_state.set(2)
                return self._generation
            if self._state == 2:
                return None  # Only one recovery probe may be in flight.
            return self._generation

    def success(self, generation: int) -> None:
        with self._lock:
            if generation != self._generation:
                return
            self._failures = 0
            if self._state == 2:
                self._generation += 1
            self._state = 0
            circuit_breaker_state.set(0)

    def failure(self, generation: int) -> None:
        with self._lock:
            if generation != self._generation:
                return
            self._failures += 1
            if self._state == 2 or self._failures >= self.threshold:
                self._state = 1
                self._opened_at = self.clock()
                self._generation += 1
                circuit_breaker_state.set(1)
