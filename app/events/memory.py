"""Process-local, group-aware test adapter (not a cross-process transport)."""

import time
from collections import defaultdict
from threading import RLock

from app.events.base import Delivery
from app.events.models import Event


class InMemoryEventBus:
    def __init__(self) -> None:
        self.messages: dict[str, list[Delivery]] = defaultdict(list)
        self.offsets: dict[tuple[str, str], int] = defaultdict(int)
        self.pending: dict[tuple[str, str], dict[str, Delivery]] = defaultdict(dict)
        self.acked: list[Delivery] = []
        self.topic = ""
        self.group = ""
        self.recovery: list[Delivery] = []
        self.lock = RLock()

    def publish(self, topic: str, event: Event) -> None:
        self.inject(topic, event.model_dump_json().encode())

    def inject(self, topic: str, payload: bytes) -> None:
        with self.lock:
            self.messages[topic].append(
                Delivery(topic, payload, str(len(self.messages[topic])))
            )

    def subscribe(self, topic: str, group: str) -> None:
        self.topic, self.group = topic, group
        self.recovery = list(self.pending[(topic, group)].values())

    def poll(self, timeout: float, limit: int) -> list[Delivery]:
        with self.lock:
            key = (self.topic, self.group)
            if self.recovery:
                recovered, self.recovery = self.recovery[:limit], self.recovery[limit:]
                return recovered
            start = self.offsets[key]
            messages = self.messages[self.topic][start : start + limit]
            self.offsets[key] += len(messages)
            self.pending[key].update({m.receipt: m for m in messages})
        if not messages:
            time.sleep(timeout)
        return messages

    def ack(self, messages: list[Delivery]) -> None:
        with self.lock:
            for message in messages:
                self.pending[(message.topic, self.group)].pop(message.receipt, None)
                self.acked.append(message)

    def lag(self) -> dict[str, float]:
        key = (self.topic, self.group)
        return {
            "pending": len(self.pending[key]),
            "unread": len(self.messages[self.topic]) - self.offsets[key],
        }

    def queue_size(self, topic: str) -> float:
        with self.lock:
            return float(len(self.messages[topic]))

    def close(self) -> None:
        pass
