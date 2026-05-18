import json
import logging

from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable
from opentelemetry import trace

from app.core.config import settings

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

TOPIC = "url-events"
_producer = None


def _get_producer():
    global _producer

    if _producer is None:
        try:
            _producer = KafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda value: json.dumps(value).encode("utf-8"),
            )
        except NoBrokersAvailable as exc:
            logger.warning("Kafka producer unavailable: %s", exc)
            return None

    return _producer


def publish_click_event(short_code: str) -> None:
    with tracer.start_as_current_span("kafka.publish") as span:
        span.set_attribute("kafka.topic", TOPIC)
        span.set_attribute("url.code", short_code)

        event = {"short_code": short_code}
        producer = _get_producer()

        if producer is None:
            span.set_attribute("kafka.error", "producer_unavailable")
            return

        try:
            producer.send(TOPIC, event)
            producer.flush()
            span.set_attribute("kafka.status", "success")
        except Exception as exc:
            span.set_attribute("kafka.error", str(exc))
            logger.warning("Failed to publish click event for %s: %s", short_code, exc)
