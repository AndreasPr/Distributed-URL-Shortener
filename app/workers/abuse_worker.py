"""Relay committed creation events, classify offline, commit before acknowledging."""

import base64
import logging
import signal
import time
from datetime import timezone
from threading import Event as StopEvent
from uuid import UUID

from opentelemetry import trace
from prometheus_client import start_http_server
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.abuse.classifier import Classifier
from app.abuse.persistence import store
from app.core.config import settings
from app.db.database import SessionLocal
from app.events import create_event_bus
from app.events.base import Delivery, EventBus
from app.events.models import DeadLetter, URLCreatedEvent
from app.models.url import URL
from app.models.url_verdict import AbuseOutbox, URLVerdict
from app.observability.context import event_span, inject_context, wire_context
from app.observability.logging import configure_logging_with_tracing
from app.observability.metrics import abuse_queue_size
from app.observability.tracing import init_tracing, shutdown_tracing

logger = logging.getLogger(__name__)


class AbuseWorker:
    def __init__(
        self, bus: EventBus, db: Session, classifier: Classifier | None = None
    ):
        self.bus, self.db = bus, db
        self.classifier = classifier if classifier is not None else Classifier()
        self.stop = StopEvent()

    def relay(self) -> None:
        rows = (
            self.db.query(AbuseOutbox)
            .order_by(AbuseOutbox.created_at)
            .with_for_update(skip_locked=True)
            .limit(10)
            .all()
        )
        try:
            for row in rows:
                with event_span(
                    "abuse.publish", row.trace_context, trace.SpanKind.PRODUCER
                ):
                    self.bus.publish(
                        settings.ABUSE_TOPIC,
                        URLCreatedEvent(
                            short_code=row.short_code,
                            event_id=UUID(row.event_id),
                            occurred_at=row.created_at.replace(tzinfo=timezone.utc),
                            trace_context=inject_context(),
                        ),
                    )
                self.db.delete(row)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def process(self, message: Delivery) -> None:
        with event_span(
            "abuse.process", wire_context(message.payload), trace.SpanKind.CONSUMER
        ):
            try:
                event = URLCreatedEvent.from_wire(message.payload)
            except (ValidationError, ValueError):
                # Invalid wire data has no recoverable DB work. Preserve for inspection.
                self.bus.publish(
                    settings.ABUSE_DLQ_TOPIC,
                    DeadLetter(
                        source_topic=message.topic,
                        payload_base64=base64.b64encode(message.payload).decode(),
                        error="invalid_creation_event",
                        attempts=1,
                        trace_context=inject_context(),
                    ),
                )
                self.bus.ack([message])
                return
            try:
                url = self.db.query(URL).filter_by(short_code=event.short_code).first()
                existing = (
                    self.db.query(URLVerdict)
                    .filter_by(short_code=event.short_code)
                    .first()
                )
                if url is not None and url.deleted_at is None and existing is None:
                    long_url = url.long_url
                    self.db.rollback()  # No open transaction during inference.
                    result = self.classifier.classify(long_url)
                    store(self.db, event.short_code, result)
                else:
                    self.db.commit()
                self.bus.ack([message])
                logger.info("Abuse event processed")
            except Exception:
                self.db.rollback()
                trace.get_current_span().set_status(trace.StatusCode.ERROR)
                raise

    def metrics(self) -> None:
        abuse_queue_size.labels("outbox").set(self.db.query(AbuseOutbox).count())
        self.db.rollback()
        lag = self.bus.lag()
        backlog = lag.get(
            "uncommitted", lag.get("unread", float("nan")) + lag.get("pending", 0)
        )
        abuse_queue_size.labels("broker").set(backlog)

    def run(self) -> None:
        pending: Delivery | None = None
        last_metrics = float("-inf")
        try:
            self.bus.subscribe(settings.ABUSE_TOPIC, settings.ABUSE_GROUP)
            while not self.stop.is_set():
                try:
                    self.relay()
                    if pending is None:
                        messages = self.bus.poll(0.2, 1)
                        pending = messages[0] if messages else None
                    if pending is not None:
                        self.process(pending)
                        pending = None
                    if time.monotonic() - last_metrics > 5:
                        self.metrics()
                        last_metrics = time.monotonic()
                except Exception as exc:
                    self.db.rollback()
                    logger.warning(
                        "Abuse processing unavailable (%s); retaining event",
                        type(exc).__name__,
                    )
                    self.stop.wait(1)
        finally:
            # No batch buffer: an interrupted event remains unacknowledged.
            self.db.close()
            self.bus.close()


def main() -> None:
    if SessionLocal is None:
        raise RuntimeError("Database not configured")
    configure_logging_with_tracing("abuse-worker")
    init_tracing(service_name="abuse-worker")
    start_http_server(settings.ABUSE_METRICS_PORT)
    worker = AbuseWorker(create_event_bus(), SessionLocal())
    signal.signal(signal.SIGTERM, lambda *_: worker.stop.set())
    signal.signal(signal.SIGINT, lambda *_: worker.stop.set())
    try:
        worker.run()
    finally:
        shutdown_tracing()


if __name__ == "__main__":
    main()
