"""Bounded best-effort click telemetry; no broker work on redirect threads."""

import logging
import time
from collections.abc import Callable
from queue import Empty, Full, Queue
from threading import Event as StopEvent
from threading import Lock, Thread

from opentelemetry import trace

from app.core.config import settings
from app.events import create_event_bus
from app.events.base import EventBus
from app.events.models import ClickEvent
from app.observability.context import event_span, inject_context
from app.observability.metrics import events_dropped_total

logger = logging.getLogger(__name__)


class BackgroundPublisher:
    def __init__(
        self,
        factory: Callable[[], EventBus] = create_event_bus,
        capacity: int = settings.EVENT_QUEUE_SIZE,
    ) -> None:
        self.factory = factory
        self.queue: Queue[ClickEvent] = Queue(maxsize=capacity)
        self.stop = StopEvent()
        self.thread: Thread | None = None
        self.lock = Lock()
        self.last_log = float("-inf")

    def dropped(self) -> None:
        events_dropped_total.inc()
        # Do not wait behind another redirect's logger or background broker call.
        if self.lock.acquire(blocking=False):
            try:
                now = time.monotonic()
                if now - self.last_log >= 30:
                    self.last_log = now
                    logger.warning(
                        "Analytics event dropped "
                        "(queue full, stopped or broker unavailable)"
                    )
            finally:
                self.lock.release()

    def start(self) -> None:
        if self.thread is not None and self.thread.is_alive():
            return
        self.stop.clear()
        self.thread = Thread(target=self._run, name="event-publisher", daemon=True)
        self.thread.start()

    def enqueue(self, short_code: str) -> None:
        try:
            if self.stop.is_set():
                self.dropped()
                return
            self.queue.put_nowait(
                ClickEvent(short_code=short_code, trace_context=inject_context())
            )
        except (Full, ValueError):
            self.dropped()

    def _run(self) -> None:
        bus = None
        try:
            while not self.stop.is_set() or not self.queue.empty():
                try:
                    event = self.queue.get(timeout=0.1)
                except Empty:
                    continue
                with event_span(
                    "events.publish", event.trace_context, trace.SpanKind.PRODUCER
                ):
                    try:
                        event.trace_context = inject_context()
                        if bus is None:
                            bus = self.factory()
                        bus.publish(settings.EVENT_TOPIC, event)
                        logger.info("Click event published")
                    except Exception:
                        trace.get_current_span().set_status(trace.StatusCode.ERROR)
                        self.dropped()
                    finally:
                        self.queue.task_done()
        finally:
            if bus is not None:
                bus.close()

    def close(self, timeout: float = 2.0) -> None:
        self.stop.set()
        if self.thread is not None:
            self.thread.join(timeout)
        # Shutdown is bounded. Queued (not currently in-flight) events are dropped.
        while True:
            try:
                self.queue.get_nowait()
            except Empty:
                break
            self.dropped()
            self.queue.task_done()


publisher = BackgroundPublisher()
