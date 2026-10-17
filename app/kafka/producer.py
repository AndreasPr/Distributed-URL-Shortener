"""Kafka construction is deliberately deferred to the background publisher."""

from kafka import KafkaProducer

from app.core.config import settings


def create_producer():
    return KafkaProducer(
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        acks="all",
        max_block_ms=1000,
        request_timeout_ms=5000,
        api_version_auto_timeout_ms=1000,
    )


def publish_click_event(short_code: str) -> None:
    # Only enqueue here: send/metadata lookup/confirmation may block on the broker.
    from app.events.publisher import publisher

    publisher.enqueue(short_code)
