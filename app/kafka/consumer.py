from kafka import KafkaConsumer

from app.core.config import settings


def create_consumer(topic: str, group: str):
    # Keep raw bytes so malformed JSON is handled by the worker's DLQ path.
    return KafkaConsumer(
        topic,
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        auto_offset_reset="earliest",
        group_id=group,
        enable_auto_commit=False,
        api_version_auto_timeout_ms=1000,
        max_poll_records=settings.EVENT_BATCH_SIZE,
    )
