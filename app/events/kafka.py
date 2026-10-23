from typing import Any

from kafka.structs import OffsetAndMetadata, TopicPartition

from app.events.base import Delivery
from app.events.models import Event
from app.kafka.consumer import create_consumer
from app.kafka.producer import create_producer


class KafkaEventBus:
    def __init__(self) -> None:
        self.producer: Any = None
        self.consumer: Any = None

    def publish(self, topic: str, event: Event) -> None:
        if self.producer is None:
            self.producer = create_producer()
        # This synchronous confirmation runs only in publisher/worker/CLI threads.
        self.producer.send(topic, event.model_dump_json().encode()).get(timeout=5)

    def subscribe(self, topic: str, group: str) -> None:
        self.consumer = create_consumer(topic, group)

    def poll(self, timeout: float, limit: int) -> list[Delivery]:
        if self.consumer is None:
            raise RuntimeError("Subscribe before polling")
        records = self.consumer.poll(
            timeout_ms=max(1, int(timeout * 1000)), max_records=limit
        )
        return [
            Delivery(m.topic, m.value, str(m.offset), m.partition)
            for batch in records.values()
            for m in batch
        ]

    def ack(self, messages: list[Delivery]) -> None:
        if self.consumer is None:
            raise RuntimeError("Subscribe before acknowledging")
        offsets: dict[TopicPartition, OffsetAndMetadata] = {}
        for message in messages:
            partition = TopicPartition(message.topic, message.partition)
            next_offset = int(message.receipt) + 1
            if partition not in offsets or next_offset > offsets[partition].offset:
                offsets[partition] = OffsetAndMetadata(next_offset, "", -1)
        if offsets:
            self.consumer.commit(offsets=offsets, timeout_ms=5000)

    def lag(self) -> dict[str, float]:
        if self.consumer is None:
            return {}
        ends = self.consumer.end_offsets(self.consumer.assignment())
        return {
            "uncommitted": sum(
                max(0, end - (self.consumer.committed(p, timeout_ms=5000) or 0))
                for p, end in ends.items()
            )
        }

    def close(self) -> None:
        if self.consumer is not None:
            self.consumer.close(autocommit=False, timeout_ms=5000)
        if self.producer is not None:
            self.producer.close(timeout=5)
