from dataclasses import dataclass
from typing import Protocol

from app.events.models import Event


@dataclass(frozen=True)
class Delivery:
    topic: str
    payload: bytes
    receipt: str
    partition: int = 0


class EventBus(Protocol):
    def publish(self, topic: str, event: Event) -> None:
        """Return only after broker acceptance; never call on a request thread."""
        ...

    def subscribe(self, topic: str, group: str) -> None: ...

    def poll(self, timeout: float, limit: int) -> list[Delivery]: ...

    def ack(self, messages: list[Delivery]) -> None: ...

    def lag(self) -> dict[str, float]: ...

    def queue_size(self, topic: str) -> float:
        """Retained broker entries (Kafka offset range is an upper bound)."""
        ...

    def close(self) -> None: ...
