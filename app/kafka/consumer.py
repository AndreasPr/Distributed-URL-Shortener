import json
import logging

from kafka import KafkaConsumer
from kafka.errors import NoBrokersAvailable

from app.core.config import settings

logger = logging.getLogger(__name__)

TOPIC = "url-events"


def create_consumer():
    try:
        return KafkaConsumer(
            TOPIC,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            auto_offset_reset="earliest",
            group_id="analytics-group",
            value_deserializer=lambda value: json.loads(value.decode("utf-8")),
        )
    except NoBrokersAvailable as exc:
        logger.warning("Kafka consumer unavailable: %s", exc)
        return None
