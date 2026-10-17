from app.core.config import settings
from app.events.base import EventBus


def create_event_bus() -> EventBus:
    if settings.EVENT_BUS == "kafka":
        from app.events.kafka import KafkaEventBus

        return KafkaEventBus()
    if settings.EVENT_BUS == "redis_streams":
        from app.events.redis_streams import RedisStreamsEventBus

        return RedisStreamsEventBus()
    if settings.EVENT_BUS == "memory":
        from app.events.memory import InMemoryEventBus

        return InMemoryEventBus()
    raise ValueError("EVENT_BUS must be kafka, redis_streams or memory")
