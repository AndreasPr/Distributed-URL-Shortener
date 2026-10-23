"""At-least-once delivery; database event IDs make click effects idempotent."""

import base64
import logging
import signal
import time
from threading import Event as StopEvent

from opentelemetry import trace
from prometheus_client import start_http_server
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import SessionLocal
from app.events import create_event_bus
from app.events.base import Delivery, EventBus
from app.events.models import ClickEvent, DeadLetter
from app.observability.context import event_span, inject_context, wire_context
from app.observability.logging import configure_logging_with_tracing
from app.observability.metrics import (
    analytics_broker_metrics_last_success_timestamp_seconds,
    consumer_lag,
    dlq_events_total,
    dlq_queue_size,
    events_consumed_total,
    events_failed_total,
    record_analytics_events_processed,
)
from app.observability.tracing import init_tracing, shutdown_tracing
from app.repositories.analytics_repository import AnalyticsRepository

logger = logging.getLogger(__name__)


class AnalyticsWorker:
    def __init__(
        self,
        bus: EventBus,
        db: Session,
        repository: AnalyticsRepository | None = None,
        batch_size: int = settings.EVENT_BATCH_SIZE,
        flush_interval: float = settings.EVENT_FLUSH_INTERVAL,
        backoff: float = settings.EVENT_RETRY_BACKOFF,
    ) -> None:
        self.bus, self.db = bus, db
        self.repository = repository or AnalyticsRepository()
        self.batch_size, self.flush_interval = batch_size, flush_interval
        self.backoff = backoff
        self.buffer: list[Delivery] = []
        self.stop = StopEvent()
        self.last_flush = time.monotonic()

    def flush(self) -> None:
        if not self.buffer:
            return
        dead_letters: list[DeadLetter] = []
        processed = 0
        try:
            for message in self.buffer:
                with event_span(
                    "analytics.process",
                    wire_context(message.payload),
                    trace.SpanKind.CONSUMER,
                ):
                    for attempt in range(1, 4):
                        try:
                            event = ClickEvent.from_wire(message.payload)
                            # Savepoints isolate poison rows from healthy rows.
                            with self.db.begin_nested():
                                self.repository.create_event(self.db, event)
                            logger.info("Click row staged")
                            processed += 1
                            break
                        except Exception as exc:
                            trace.get_current_span().set_status(trace.StatusCode.ERROR)
                            logger.warning(
                                "Click processing failed (%s)", type(exc).__name__
                            )
                            events_failed_total.inc()
                            if isinstance(exc, DBAPIError) and not isinstance(
                                exc, IntegrityError
                            ):
                                # Infrastructure failures never divert clicks.
                                # The run loop retries the retained batch.
                                raise
                            if attempt < 3:
                                time.sleep(self.backoff * (2 ** (attempt - 1)))
                                continue
                            dead_letters.append(
                                DeadLetter(
                                    trace_context=inject_context(),
                                    source_topic=message.topic,
                                    payload_base64=base64.b64encode(
                                        message.payload
                                    ).decode(),
                                    # Never include SQL parameters or raw payload.
                                    error=type(exc).__name__,
                                )
                            )
            try:
                self.db.commit()
            except Exception:
                events_failed_total.inc()
                raise
        except Exception:
            self.db.rollback()
            raise
        # Kafka commits advance over earlier messages: acknowledge the entire
        # ordered batch only after EVERY row commits or its DLQ publish succeeds.
        for dead_letter in dead_letters:
            with event_span(
                "events.dead_letter", dead_letter.trace_context, trace.SpanKind.PRODUCER
            ):
                dead_letter.trace_context = inject_context()
                self.bus.publish(settings.EVENT_DLQ_TOPIC, dead_letter)
            dlq_events_total.inc()
        self.bus.ack(self.buffer)
        record_analytics_events_processed(processed)
        self.buffer.clear()
        self.last_flush = time.monotonic()

    def _flush_due(self) -> None:
        if self.buffer and (
            len(self.buffer) >= self.batch_size
            or time.monotonic() - self.last_flush >= self.flush_interval
        ):
            self.flush()

    def run(self) -> None:
        failures = 0
        last_lag = float("-inf")
        try:
            self.bus.subscribe(settings.EVENT_TOPIC, settings.EVENT_CONSUMER_GROUP)
            while not self.stop.is_set():
                try:
                    # Check before broker I/O too: an outage must not strand a batch.
                    self._flush_due()
                    if len(self.buffer) < self.batch_size:
                        remaining = self.flush_interval
                        if self.buffer:
                            remaining = max(
                                0.001,
                                self.flush_interval
                                - (time.monotonic() - self.last_flush),
                            )
                        messages = self.bus.poll(
                            min(0.2, remaining), self.batch_size - len(self.buffer)
                        )
                        if messages and not self.buffer:
                            self.last_flush = time.monotonic()
                        self.buffer.extend(messages)
                        events_consumed_total.inc(len(messages))
                    self._flush_due()
                    failures = 0
                    if time.monotonic() - last_lag >= 5:
                        for kind, lag in self.bus.lag().items():
                            consumer_lag.labels(settings.EVENT_BUS, kind).set(lag)
                        dlq_queue_size.labels(settings.EVENT_BUS).set(
                            self.bus.queue_size(settings.EVENT_DLQ_TOPIC)
                        )
                        analytics_broker_metrics_last_success_timestamp_seconds.set(
                            time.time()
                        )
                        last_lag = time.monotonic()
                except Exception as exc:
                    failures += 1
                    logger.warning(
                        "Analytics unavailable (%s); retaining unacknowledged batch",
                        type(exc).__name__,
                    )
                    self.stop.wait(min(5, self.backoff * 2 ** min(failures - 1, 5)))
        finally:
            try:
                self.flush()
            finally:
                self.db.close()
                self.bus.close()


def main() -> None:
    if SessionLocal is None:
        raise RuntimeError("Database not configured")
    configure_logging_with_tracing("worker")
    init_tracing(service_name="worker")
    start_http_server(settings.EVENT_METRICS_PORT)
    worker = AnalyticsWorker(create_event_bus(), SessionLocal())
    signal.signal(signal.SIGTERM, lambda *_: worker.stop.set())
    signal.signal(signal.SIGINT, lambda *_: worker.stop.set())
    try:
        worker.run()
    finally:
        shutdown_tracing()


if __name__ == "__main__":
    main()
