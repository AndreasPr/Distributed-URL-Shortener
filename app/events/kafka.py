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
        lag = 0
        for partition, end in ends.items():
            committed = self.consumer.committed(partition, timeout_ms=5000)
            if committed is None:
                # A new group starts at earliest retained data, not offset zero.
                committed = self.consumer.beginning_offsets([partition])[partition]
            lag += max(0, end - committed)
        return {"uncommitted": float(lag)}

    def queue_size(self, topic: str) -> float:
        if self.consumer is None:
            raise RuntimeError("Subscribe before inspecting queue size")
        partitions = self.consumer.partitions_for_topic(topic) or set()
        if not partitions:
            return 0.0
        selected = [TopicPartition(topic, partition) for partition in partitions]
        starts = self.consumer.beginning_offsets(selected)
        ends = self.consumer.end_offsets(selected)
        return float(sum(max(0, ends[p] - starts[p]) for p in selected))

    def close(self) -> None:
        if self.consumer is not None:
            self.consumer.close(autocommit=False, timeout_ms=5000)
        if self.producer is not None:
            self.producer.close(timeout=5)
