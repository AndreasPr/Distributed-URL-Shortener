"""Hosted consumers use isolated sessions, cooperative stops and bounded joins."""

import logging
import math
import time
from collections.abc import Callable
from threading import Event, Lock, Thread
from typing import Protocol

from app.observability.metrics import (
    hosted_shutdown_timeouts_total,
    hosted_worker_alive,
    hosted_worker_healthy,
    hosted_worker_lag,
    hosted_worker_restarts_total,
)

logger = logging.getLogger(__name__)


class Consumer(Protocol):
    stop: Event
    last_success: float
    lag_value: float

    def run(self) -> None: ...


class Supervisor:
    def __init__(
        self,
        factories: dict[str, Callable[[], Consumer]],
        prepare: Callable[[], None] = lambda: None,
        backoff: float = 0.5,
        cap: float = 30,
    ):
        self.factories, self.prepare = factories, prepare
        self.backoff, self.cap = backoff, cap
        self.stop = Event()
        self.ready = Event()
        self.lock = Lock()
        self.workers: dict[str, Consumer] = {}
        self.threads: dict[str, Thread] = {}
        self.bootstrap: Thread | None = None

    def start(self) -> None:
        self.bootstrap = Thread(
            target=self._prepare, daemon=True, name="hosted-startup"
        )
        self.bootstrap.start()

    def _prepare(self) -> None:
        attempt = 0
        while not self.stop.is_set():
            try:
                self.prepare()
                break
            except Exception as exc:
                logger.error("Hosted migration unavailable (%s)", type(exc).__name__)
                self.stop.wait(min(self.cap, self.backoff * 2 ** min(attempt, 10)))
                attempt += 1
        with self.lock:
            if self.stop.is_set():
                return
            self.ready.set()
            for name, factory in self.factories.items():
                thread = Thread(
                    target=self._run, args=(name, factory), daemon=True, name=name
                )
                self.threads[name] = thread
                thread.start()
        while not self.stop.wait(0.25):
            self.snapshot()

    def _run(self, name: str, factory: Callable[[], Consumer]) -> None:
        attempt = 0
        while not self.stop.is_set():
            started = time.monotonic()
            try:
                worker = factory()
                with self.lock:
                    self.workers[name] = worker
                    if self.stop.is_set():
                        worker.stop.set()
                worker.run()
            except Exception as exc:
                logger.warning(
                    "Hosted consumer stopped (%s, %s)", name, type(exc).__name__
                )
            finally:
                with self.lock:
                    self.workers.pop(name, None)
                hosted_worker_alive.labels(name).set(0)
                hosted_worker_healthy.labels(name).set(0)
            if self.stop.is_set():
                return
            hosted_worker_restarts_total.labels(name).inc()
            if time.monotonic() - started >= 60:
                attempt = 0
            self.stop.wait(min(self.cap, self.backoff * 2 ** min(attempt, 10)))
            attempt += 1

    def snapshot(self) -> dict[str, dict]:
        result = {}
        with self.lock:
            for name in self.factories:
                worker = self.workers.get(name)
                alive = worker is not None
                healthy = (
                    alive and time.monotonic() - worker.last_success < 15
                    if worker
                    else False
                )
                lag = worker.lag_value if healthy and worker else float("nan")
                hosted_worker_alive.labels(name).set(int(alive))
                hosted_worker_healthy.labels(name).set(int(healthy))
                hosted_worker_lag.labels(name).set(lag)
                result[name] = {
                    "alive": alive,
                    "healthy": healthy,
                    "lag": lag if math.isfinite(lag) else None,
                }
        return result

    def close(self, timeout: float = 7) -> None:
        deadline = time.monotonic() + timeout
        with self.lock:
            self.stop.set()
            for worker in self.workers.values():
                worker.stop.set()
            threads = list(self.threads.values())
        if self.bootstrap:
            threads.append(self.bootstrap)
        for thread in threads:
            thread.join(max(0, deadline - time.monotonic()))
        if any(thread.is_alive() for thread in threads):
            hosted_shutdown_timeouts_total.inc()
            logger.error(
                "Hosted shutdown deadline reached; pending events remain unacknowledged"
            )
        self.snapshot()


def hosted_supervisor() -> Supervisor:
    # Even importing Alembic/consumer modules belongs off the startup critical path.
    def prepare() -> None:
        from app.db.startup import migrate

        migrate()

    def create(name: str):
        from app.db.database import SessionLocal
        from app.events import create_event_bus
        from app.workers.abuse_worker import AbuseWorker
        from app.workers.analytics_worker import AnalyticsWorker

        if SessionLocal is None:
            raise RuntimeError("Database not configured")
        bus = create_event_bus()
        db = SessionLocal()
        try:
            return (
                AnalyticsWorker(bus, db)
                if name == "analytics"
                else AbuseWorker(bus, db)
            )
        except Exception:
            db.close()
            bus.close()
            raise

    return Supervisor(
        {"analytics": lambda: create("analytics"), "abuse": lambda: create("abuse")},
        prepare=prepare,
    )
